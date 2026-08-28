import type { WorkspaceCollection } from '../organize/collections';
import type { PageTreeNode } from '../yjs/page-tree';
import type { ParsedPage } from '../yjs/parse-page-doc';
import type { AffineCredentialKind } from '../utils/enums/affine-credential-kind.enum';

export interface AffineUser {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly avatarUrl: string | undefined;
}

export interface PageAuthor {
  readonly name: string;
  readonly avatarUrl: string | undefined;
}

export interface MentionPerson {
  readonly name: string;
  readonly avatarUrl: string | undefined;
}

export type MentionPeople = Readonly<Record<string, MentionPerson>>;

export interface PagePreview {
  readonly page: ParsedPage;
  readonly createdBy: PageAuthor | undefined;
  readonly updatedBy: PageAuthor | undefined;
  readonly mentionPeople: MentionPeople;
}

export interface AffineWorkspace {
  readonly id: string;
}

export interface AffineWorkspacePages {
  readonly name: string | null;
  readonly documents: readonly AffineDocument[];
  readonly tree: readonly PageTreeNode[];
  readonly favorites: readonly AffineDocument[];
  readonly collections: readonly WorkspaceCollection[];
}

export interface AffineDocument {
  readonly id: string;
  readonly workspaceId: string;
  readonly title: string | null;
  readonly updatedAt: string | null;
  readonly tags?: readonly string[];
}

export interface AffineSearchHit {
  readonly workspaceId: string;
  readonly docId: string;
  readonly title: string;
  readonly highlight: string;
}

export interface GraphQLErrorExtensions {
  readonly code: string | undefined;
  readonly status: number | undefined;
}

export interface GraphQLErrorBody {
  readonly message: string;
  readonly extensions: GraphQLErrorExtensions | undefined;
}

export interface GraphQLResponse<T> {
  readonly data: T | null;
  readonly errors: readonly GraphQLErrorBody[] | undefined;
}

export interface GraphQLRequestInput {
  readonly query: string;
  readonly variables?: Readonly<Record<string, unknown>> | undefined;
}

export interface AccessTokenCredential {
  readonly kind: AffineCredentialKind.ACCESS_TOKEN;
  readonly token: string;
}

export interface SessionCredential {
  readonly kind: AffineCredentialKind.SESSION;
  readonly cookieHeader: string;
  readonly csrfToken: string | undefined;
}

export type AffineCredential = AccessTokenCredential | SessionCredential;

export interface BoundAffineCredential {
  readonly serverUrl: string;
  readonly credential: AffineCredential;
}

export interface SignInWithTokenInput {
  readonly token: string;
}

export interface SignInWithPasswordInput {
  readonly email: string;
  readonly password: string;
}

export interface RevealedAccessToken {
  readonly id: string;
  readonly token: string;
}

export interface CreatePageInput {
  readonly workspaceId: string;
  readonly title: string;
  readonly folderId: string | null;
}

export interface CreateFolderInput {
  readonly workspaceId: string;
  readonly title: string;
  readonly parentId: string | null;
}

export interface SecretStore {
  get(key: string): Promise<string | undefined>;
  store(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
}
