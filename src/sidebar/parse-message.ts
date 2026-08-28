import { SidebarMessageType } from '../utils/enums/sidebar-message-type.enum';
import { parseSidebarMessageType } from '../utils/sidebar-message-type';
import type { SidebarToHost } from './sidebar.types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requiredString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

export function parseSidebarMessage(value: unknown): SidebarToHost | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const type = parseSidebarMessageType(value['type']);
  if (type === undefined) {
    return undefined;
  }

  switch (type) {
    case SidebarMessageType.SIGN_OUT:
      return { type };
    case SidebarMessageType.REFRESH:
      return { type };
    case SidebarMessageType.FORCE_RELOAD:
      return { type };
    case SidebarMessageType.SEARCH:
      return { type };
    case SidebarMessageType.CREATE_PAGE:
      return { type };
    case SidebarMessageType.CREATE_FOLDER:
      return { type };
    case SidebarMessageType.RESTORE_DOCUMENT:
      return { type };
    case SidebarMessageType.SIGN_IN_WITH_TOKEN: {
      const token = requiredString(value['token']);
      if (token === undefined) {
        return undefined;
      }
      return { type, token };
    }
    case SidebarMessageType.SET_SERVER_URL: {
      const serverUrl = requiredString(value['serverUrl']);
      if (serverUrl === undefined) {
        return undefined;
      }
      return { type, serverUrl };
    }
    case SidebarMessageType.SIGN_IN_WITH_PASSWORD: {
      const email = requiredString(value['email']);
      const password = requiredString(value['password']);
      if (email === undefined || password === undefined) {
        return undefined;
      }
      return { type, email, password };
    }
    case SidebarMessageType.OPEN_DOCUMENT:
    case SidebarMessageType.OPEN_IN_BROWSER:
    case SidebarMessageType.DELETE_DOCUMENT:
    case SidebarMessageType.MOVE_DOCUMENT: {
      const workspaceId = requiredString(value['workspaceId']);
      const docId = requiredString(value['docId']);
      if (workspaceId === undefined || docId === undefined) {
        return undefined;
      }
      return { type, workspaceId, docId };
    }
  }
}
