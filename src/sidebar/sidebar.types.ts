import type { PageTreeNode } from '../yjs/page-tree';
import type { RecentPage } from '../sync/recent-pages';
import type { SidebarMessageType } from '../utils/enums/sidebar-message-type.enum';
import type { SidebarStatus } from '../utils/enums/sidebar-status.enum';

export interface SidebarDocument {
  readonly id: string;
  readonly title: string;
  readonly tags: readonly string[];
}

export interface SidebarWorkspace {
  readonly id: string;
  readonly label: string;
  readonly documents: readonly SidebarDocument[];
  readonly tree: readonly PageTreeNode[];
  readonly favorites: readonly SidebarDocument[];
  readonly collections: readonly SidebarCollection[];
}

export interface SidebarCollection {
  readonly id: string;
  readonly title: string;
}

export interface SignedOutSidebarState {
  readonly status: SidebarStatus.SIGNED_OUT;
  readonly serverUrl: string;
  readonly error: string | undefined;
  readonly busy: boolean;
}

export interface SignedInSidebarState {
  readonly status: SidebarStatus.SIGNED_IN;
  readonly serverUrl: string;
  readonly email: string;
  readonly userName: string;
  readonly avatarUrl: string | undefined;
  readonly workspaces: readonly SidebarWorkspace[];
  readonly error: string | undefined;
  readonly busy: boolean;
  readonly query: string;
  readonly lastSyncedLabel: string | undefined;
  readonly pendingDocId: string | undefined;
  readonly recents: readonly RecentPage[];
}

export type SidebarState = SignedOutSidebarState | SignedInSidebarState;

export interface SignInWithTokenMessage {
  readonly type: SidebarMessageType.SIGN_IN_WITH_TOKEN;
  readonly token: string;
}

export interface SignInWithPasswordMessage {
  readonly type: SidebarMessageType.SIGN_IN_WITH_PASSWORD;
  readonly email: string;
  readonly password: string;
}

export interface SignOutMessage {
  readonly type: SidebarMessageType.SIGN_OUT;
}

export interface OpenDocumentMessage {
  readonly type: SidebarMessageType.OPEN_DOCUMENT;
  readonly workspaceId: string;
  readonly docId: string;
}

export interface OpenInBrowserMessage {
  readonly type: SidebarMessageType.OPEN_IN_BROWSER;
  readonly workspaceId: string;
  readonly docId: string;
}

export interface DeleteDocumentMessage {
  readonly type: SidebarMessageType.DELETE_DOCUMENT;
  readonly workspaceId: string;
  readonly docId: string;
}

export interface MoveDocumentMessage {
  readonly type: SidebarMessageType.MOVE_DOCUMENT;
  readonly workspaceId: string;
  readonly docId: string;
}

export interface RefreshMessage {
  readonly type: SidebarMessageType.REFRESH;
}

export interface ForceReloadMessage {
  readonly type: SidebarMessageType.FORCE_RELOAD;
}

export interface SearchMessage {
  readonly type: SidebarMessageType.SEARCH;
}

export interface CreatePageMessage {
  readonly type: SidebarMessageType.CREATE_PAGE;
}

export interface CreateFolderMessage {
  readonly type: SidebarMessageType.CREATE_FOLDER;
}

export interface RestoreDocumentMessage {
  readonly type: SidebarMessageType.RESTORE_DOCUMENT;
}

export interface SetServerUrlMessage {
  readonly type: SidebarMessageType.SET_SERVER_URL;
  readonly serverUrl: string;
}

export type SidebarToHost =
  | SignInWithTokenMessage
  | SignInWithPasswordMessage
  | SignOutMessage
  | OpenDocumentMessage
  | OpenInBrowserMessage
  | DeleteDocumentMessage
  | MoveDocumentMessage
  | RefreshMessage
  | ForceReloadMessage
  | SearchMessage
  | CreatePageMessage
  | CreateFolderMessage
  | RestoreDocumentMessage
  | SetServerUrlMessage;

export interface SidebarHtmlInput {
  readonly state: SidebarState;
  readonly nonce: string;
  readonly cspSource: string;
}
