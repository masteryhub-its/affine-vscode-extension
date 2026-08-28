import { ACCESS_TOKEN_NAME, CLIENT_VERSION_HEADER, DOC_PAGE_SIZE, MAX_DOC_PAGES, SIGN_IN_PATH } from '../constants';
import { AffineError, AffineErrorCode } from '../errors/affine-error';
import type { AffineSync } from '../sync/affine-sync';
import { encodeCreateFolderUpdate } from '../yjs/encode-create-folder-update';
import { encodeFolderMoveUpdate, emptyYDocBin } from '../yjs/encode-folder-move-update';
import { encodeCreatePageMetaUpdate, encodeRenamePageUpdate, encodeRestorePageUpdate, encodeTrashPageUpdate } from '../yjs/encode-page-meta-update';
import { encodeEmptyPageDoc } from '../yjs/encode-page-doc';
import { parseCollections } from '../organize/collections';
import { parseFoldersTable } from '../yjs/parse-folders-table';
import { mentionUserIds, parsePageDoc, type ParsedPage } from '../yjs/parse-page-doc';
import { parseTrashedPages, parseWorkspaceRoot } from '../yjs/parse-workspace-root';
import { AffineCredentialKind } from '../utils/enums/affine-credential-kind.enum';
import { HttpMethod } from '../utils/enums/http-method.enum';
import { PageTreeKind } from '../utils/enums/page-tree-kind.enum';
import { buildPageTree, type FolderRecord, type PageTreeNode, type PageTreePage } from '../yjs/page-tree';
import type {
  AffineCredential,
  AffineDocument,
  AffineSearchHit,
  AffineUser,
  AffineWorkspace,
  AffineWorkspacePages,
  CreateFolderInput,
  CreatePageInput,
  MentionPeople,
  MentionPerson,
  PageAuthor,
  PagePreview,
  RevealedAccessToken,
  SignInWithPasswordInput,
} from './affine.types';
import { cookieHeaderFromRecords, findCookieValue, affineSessionCookies, parseSetCookieHeaders } from './cookies';
import { credentialHeaders } from './credential-headers';
import { buildWorkspaceDocUrl, documentTitle, foldersTableDocId, resolveAssetUrl } from './document-url';
import { GraphQLClient } from './graphql-client';
import type { HttpClient } from './http.types';
import { CURRENT_USER_QUERY, GENERATE_ACCESS_TOKEN_MUTATION, PAGE_AUTHORS_QUERY, PUBLIC_USER_QUERY, SEARCH_DOCS_QUERY, WORKSPACE_DOCS_QUERY, WORKSPACES_QUERY } from './queries';

export interface AffineClientOptions {
  readonly serverUrl: string;
  readonly clientVersion: string;
  readonly http: HttpClient;
  readonly credential: AffineCredential | undefined;
  readonly sync?: AffineSync;
}

interface GraphQLUserFields {
  readonly name: string | null;
  readonly avatarUrl: string | null;
}

interface CurrentUserQueryData {
  readonly currentUser: {
    readonly id: string;
    readonly email: string;
    readonly name: string;
    readonly avatarUrl: string | null;
  } | null;
}

interface PageAuthorsQueryData {
  readonly workspace: {
    readonly doc: {
      readonly createdBy: GraphQLUserFields | null;
      readonly lastUpdatedBy: GraphQLUserFields | null;
    } | null;
  } | null;
}

interface PublicUserQueryData {
  readonly publicUserById: {
    readonly id: string;
    readonly name: string | null;
    readonly avatarUrl: string | null;
  } | null;
}

interface WorkspacesQueryData {
  readonly workspaces: readonly AffineWorkspace[];
}

interface WorkspaceDocsQueryData {
  readonly workspace: {
    readonly id: string;
    readonly docs: {
      readonly edges: readonly {
        readonly cursor: string;
        readonly node: AffineDocument;
      }[];
      readonly pageInfo: {
        readonly hasNextPage: boolean;
        readonly endCursor: string | null;
      };
    };
  } | null;
}

interface SearchDocsQueryData {
  readonly workspace: {
    readonly id: string;
    readonly searchDocs: readonly {
      readonly docId: string;
      readonly title: string;
      readonly highlight: string;
    }[];
  } | null;
}

interface GenerateTokenMutationData {
  readonly generateUserAccessToken: RevealedAccessToken;
}

interface PageAuthors {
  readonly createdBy: PageAuthor | undefined;
  readonly updatedBy: PageAuthor | undefined;
}

export class AffineClient {
  private readonly graphql: GraphQLClient;
  private readonly options: AffineClientOptions;

  public constructor(options: AffineClientOptions) {
    this.options = options;
    this.graphql = new GraphQLClient({
      serverUrl: options.serverUrl,
      clientVersion: options.clientVersion,
      http: options.http,
      credential: options.credential,
    });
  }

  public withCredential(credential: AffineCredential): AffineClient {
    return new AffineClient({ ...this.options, credential });
  }

  public async currentUser(): Promise<AffineUser> {
    const data = await this.graphql.request<CurrentUserQueryData>({ query: CURRENT_USER_QUERY });
    if (data.currentUser === null) {
      throw new AffineError('Not signed in', AffineErrorCode.UNAUTHENTICATED);
    }
    return {
      id: data.currentUser.id,
      email: data.currentUser.email,
      name: data.currentUser.name,
      avatarUrl: resolveAssetUrl(this.options.serverUrl, data.currentUser.avatarUrl),
    };
  }

  public async listWorkspaces(): Promise<readonly AffineWorkspace[]> {
    const data = await this.graphql.request<WorkspacesQueryData>({ query: WORKSPACES_QUERY });
    return data.workspaces;
  }

  public async listAllDocs(workspaceId: string): Promise<readonly AffineDocument[]> {
    const documents: AffineDocument[] = [];
    let after: string | undefined;
    for (let page = 0; page < MAX_DOC_PAGES; page += 1) {
      const data = await this.graphql.request<WorkspaceDocsQueryData>({
        query: WORKSPACE_DOCS_QUERY,
        variables: {
          workspaceId,
          first: DOC_PAGE_SIZE,
          after: after ?? null,
        },
      });
      if (data.workspace === null) {
        throw new AffineError(`Workspace ${workspaceId} was not found`, AffineErrorCode.UNEXPECTED_RESPONSE);
      }
      for (const edge of data.workspace.docs.edges) {
        documents.push(edge.node);
      }
      if (!data.workspace.docs.pageInfo.hasNextPage) {
        return documents;
      }
      const endCursor = data.workspace.docs.pageInfo.endCursor;
      if (endCursor === null || endCursor.length === 0) {
        return documents;
      }
      after = endCursor;
    }
    return documents;
  }

  public async listWorkspacePages(workspaceId: string): Promise<AffineWorkspacePages> {
    try {
      const parsed = parseWorkspaceRoot(await this.fetchWorkspaceDoc(workspaceId, workspaceId));
      const folders = await this.loadFolderRecords(workspaceId);
      const documents = parsed.pages.map((page) => ({
        id: page.id,
        workspaceId,
        title: page.title,
        updatedAt: null,
        ...(page.tags !== undefined && page.tags.length > 0 ? { tags: page.tags } : {}),
      }));
      return {
        name: parsed.name,
        documents,
        tree: buildPageTree({ pages: parsed.pages, folders }),
        favorites: documents.filter((_, index) => parsed.pages[index]?.favorite === true),
        collections: parseCollections(folders),
      };
    } catch {
      const documents = (await this.listAllDocs(workspaceId)).filter((document) => isListedWorkspaceDoc(workspaceId, document.id));
      return { name: null, documents, tree: documentsToTree(documents), favorites: [], collections: [] };
    }
  }

  public async loadPageDoc(workspaceId: string, docId: string): Promise<ParsedPage> {
    return parsePageDoc(await this.fetchWorkspaceDoc(workspaceId, docId));
  }

  public async loadPagePreview(workspaceId: string, docId: string): Promise<PagePreview> {
    const page = await this.loadPageDoc(workspaceId, docId);
    const authors = await this.loadPageAuthors(workspaceId, docId);
    return {
      page,
      createdBy: authors.createdBy,
      updatedBy: authors.updatedBy,
      mentionPeople: await this.loadMentionPeople(mentionUserIds(page)),
    };
  }

  public async trashPage(workspaceId: string, docId: string): Promise<void> {
    const update = encodeTrashPageUpdate(await this.fetchWorkspaceDoc(workspaceId, workspaceId), docId);
    await this.requireSync().pushDocUpdate({ workspaceId, docId: workspaceId, update });
  }

  public async restorePage(workspaceId: string, docId: string): Promise<void> {
    const update = encodeRestorePageUpdate(await this.fetchWorkspaceDoc(workspaceId, workspaceId), docId);
    await this.requireSync().pushDocUpdate({ workspaceId, docId: workspaceId, update });
  }

  public async listTrashedPages(workspaceId: string): Promise<readonly PageTreePage[]> {
    return parseTrashedPages(await this.fetchWorkspaceDoc(workspaceId, workspaceId));
  }

  public async renamePage(workspaceId: string, docId: string, title: string): Promise<void> {
    const update = encodeRenamePageUpdate(await this.fetchWorkspaceDoc(workspaceId, workspaceId), { docId, title });
    await this.requireSync().pushDocUpdate({ workspaceId, docId: workspaceId, update });
  }

  public async duplicatePage(workspaceId: string, docId: string): Promise<AffineDocument> {
    const pageBin = await this.fetchWorkspaceDoc(workspaceId, docId);
    const rootBin = await this.fetchWorkspaceDoc(workspaceId, workspaceId);
    const source = parseWorkspaceRoot(rootBin).pages.find((page) => page.id === docId);
    const title = `Copy of ${documentTitle(source?.title)}`;
    const copyId = crypto.randomUUID();
    const sync = this.requireSync();
    await sync.pushDocUpdate({ workspaceId, docId: copyId, update: pageBin });
    const metaUpdate = encodeCreatePageMetaUpdate(rootBin, { docId: copyId, title });
    await sync.pushDocUpdate({ workspaceId, docId: workspaceId, update: metaUpdate });
    return { id: copyId, workspaceId, title, updatedAt: null };
  }

  public async createPage(input: CreatePageInput): Promise<AffineDocument> {
    const docId = crypto.randomUUID();
    const pageBin = encodeEmptyPageDoc({
      title: input.title,
      pageId: crypto.randomUUID(),
      noteId: crypto.randomUUID(),
      paragraphId: crypto.randomUUID(),
      surfaceId: crypto.randomUUID(),
    });
    const sync = this.requireSync();
    await sync.pushDocUpdate({ workspaceId: input.workspaceId, docId, update: pageBin });
    const metaUpdate = encodeCreatePageMetaUpdate(await this.fetchWorkspaceDoc(input.workspaceId, input.workspaceId), { docId, title: input.title });
    await sync.pushDocUpdate({ workspaceId: input.workspaceId, docId: input.workspaceId, update: metaUpdate });
    if (input.folderId !== null) {
      await this.movePage(input.workspaceId, docId, input.folderId);
    }
    return { id: docId, workspaceId: input.workspaceId, title: input.title, updatedAt: null };
  }

  public async createFolder(input: CreateFolderInput): Promise<void> {
    const foldersId = foldersTableDocId(input.workspaceId);
    const bin = await this.loadFolderBin(input.workspaceId);
    const update = encodeCreateFolderUpdate({
      bin,
      folderId: crypto.randomUUID(),
      parentId: input.parentId,
      title: input.title,
      index: nextOrganizeIndex(),
    });
    await this.requireSync().pushDocUpdate({ workspaceId: input.workspaceId, docId: foldersId, update });
  }

  public async movePage(workspaceId: string, docId: string, folderId: string | null): Promise<void> {
    const foldersId = foldersTableDocId(workspaceId);
    const bin = await this.loadFolderBin(workspaceId);
    const update = encodeFolderMoveUpdate({
      bin,
      docId,
      parentId: folderId,
      index: nextOrganizeIndex(),
      newRecordId: newOrganizeRecordId(),
    });
    await this.requireSync().pushDocUpdate({ workspaceId, docId: foldersId, update });
  }

  public async searchDocs(workspaceId: string, keyword: string): Promise<readonly AffineSearchHit[]> {
    const data = await this.graphql.request<SearchDocsQueryData>({
      query: SEARCH_DOCS_QUERY,
      variables: { workspaceId, keyword, limit: 20 },
    });
    if (data.workspace === null) {
      throw new AffineError(`Workspace ${workspaceId} was not found`, AffineErrorCode.UNEXPECTED_RESPONSE);
    }
    return data.workspace.searchDocs.map((hit) => ({
      workspaceId,
      docId: hit.docId,
      title: hit.title,
      highlight: hit.highlight,
    }));
  }

  public async generateAccessToken(): Promise<RevealedAccessToken> {
    const data = await this.graphql.request<GenerateTokenMutationData>({
      query: GENERATE_ACCESS_TOKEN_MUTATION,
      variables: { name: ACCESS_TOKEN_NAME },
    });
    return data.generateUserAccessToken;
  }

  public async signInWithPassword(input: SignInWithPasswordInput): Promise<AffineCredential> {
    const response = await this.options.http({
      url: `${this.options.serverUrl}${SIGN_IN_PATH}`,
      method: HttpMethod.POST,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: input.email, password: input.password }),
    });

    if (response.status < 200 || response.status >= 300) {
      throw new AffineError('Email or password is incorrect', AffineErrorCode.AUTHENTICATION_FAILED);
    }

    const cookies = affineSessionCookies(parseSetCookieHeaders(response.setCookie));
    const cookieHeader = cookieHeaderFromRecords(cookies);
    if (cookieHeader.length === 0) {
      throw new AffineError('AFFiNE sign-in did not return a session cookie', AffineErrorCode.AUTHENTICATION_FAILED);
    }

    const session: AffineCredential = {
      kind: AffineCredentialKind.SESSION,
      cookieHeader,
      csrfToken: findCookieValue(cookies, 'affine_csrf_token'),
    };

    const authed = this.withCredential(session);
    try {
      const token = await authed.generateAccessToken();
      return { kind: AffineCredentialKind.ACCESS_TOKEN, token: token.token };
    } catch {
      return session;
    }
  }

  private async loadPageAuthors(workspaceId: string, docId: string): Promise<PageAuthors> {
    try {
      const data = await this.graphql.request<PageAuthorsQueryData>({
        query: PAGE_AUTHORS_QUERY,
        variables: { workspaceId, docId },
      });
      const doc = data.workspace === null ? undefined : data.workspace.doc;
      return {
        createdBy: this.toAuthor(doc === null || doc === undefined ? null : doc.createdBy),
        updatedBy: this.toAuthor(doc === null || doc === undefined ? null : doc.lastUpdatedBy),
      };
    } catch {
      return { createdBy: undefined, updatedBy: undefined };
    }
  }

  private async loadMentionPeople(ids: readonly string[]): Promise<MentionPeople> {
    const people: Record<string, MentionPerson> = {};
    for (const id of ids) {
      try {
        const data = await this.graphql.request<PublicUserQueryData>({
          query: PUBLIC_USER_QUERY,
          variables: { id },
        });
        const name = data.publicUserById?.name?.trim();
        if (name !== undefined && name.length > 0) {
          people[id] = { name, avatarUrl: resolveAssetUrl(this.options.serverUrl, data.publicUserById?.avatarUrl) };
        }
      } catch {
        continue;
      }
    }
    return people;
  }

  private toAuthor(user: GraphQLUserFields | null): PageAuthor | undefined {
    if (user === null) {
      return undefined;
    }
    const name = user.name?.trim();
    if (name === undefined || name.length === 0) {
      return undefined;
    }
    return { name, avatarUrl: resolveAssetUrl(this.options.serverUrl, user.avatarUrl) };
  }

  private async loadFolderRecords(workspaceId: string): Promise<readonly FolderRecord[]> {
    try {
      return parseFoldersTable(await this.fetchWorkspaceDoc(workspaceId, foldersTableDocId(workspaceId)));
    } catch {
      return [];
    }
  }

  private async loadFolderBin(workspaceId: string): Promise<Uint8Array> {
    try {
      return await this.fetchWorkspaceDoc(workspaceId, foldersTableDocId(workspaceId));
    } catch {
      return emptyYDocBin();
    }
  }

  private requireSync(): AffineSync {
    if (this.options.sync === undefined) {
      throw new AffineError('AFFiNE sync is not configured', AffineErrorCode.SYNC_ERROR);
    }
    return this.options.sync;
  }

  private async fetchWorkspaceDoc(workspaceId: string, docId: string): Promise<Uint8Array> {
    const response = await this.options.http({
      url: buildWorkspaceDocUrl(this.options.serverUrl, workspaceId, docId),
      method: HttpMethod.GET,
      headers: {
        [CLIENT_VERSION_HEADER]: this.options.clientVersion,
        ...credentialHeaders(this.options.credential),
      },
    });
    if (response.status < 200 || response.status >= 300) {
      throw new AffineError(`Workspace document request failed with HTTP ${response.status}`, AffineErrorCode.HTTP_ERROR);
    }
    const bytes = response.bodyBytes;
    if (bytes === undefined || bytes.byteLength === 0) {
      throw new AffineError('Workspace document was empty', AffineErrorCode.UNEXPECTED_RESPONSE);
    }
    return bytes;
  }
}

function isListedWorkspaceDoc(workspaceId: string, docId: string): boolean {
  return docId !== workspaceId && !docId.startsWith('db$');
}

function documentsToTree(documents: readonly AffineDocument[]): readonly PageTreeNode[] {
  return documents.map((document) => ({ kind: PageTreeKind.DOC, id: document.id, title: documentTitle(document.title), children: [] }));
}

function nextOrganizeIndex(): string {
  return `a${Date.now().toString(36)}`;
}

function newOrganizeRecordId(): string {
  return crypto.randomUUID();
}
