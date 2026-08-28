import { parseSidebarMessage } from './parse-message';
import { SidebarMessageType } from '../utils/enums/sidebar-message-type.enum';

describe('parseSidebarMessage', () => {
  it('accepts a password sign-in payload', () => {
    expect(parseSidebarMessage({ type: SidebarMessageType.SIGN_IN_WITH_PASSWORD, email: 'a@b.c', password: 'secret' })).toEqual({
      type: SidebarMessageType.SIGN_IN_WITH_PASSWORD,
      email: 'a@b.c',
      password: 'secret',
    });
  });

  it('accepts an open-document payload', () => {
    expect(parseSidebarMessage({ type: SidebarMessageType.OPEN_DOCUMENT, workspaceId: 'ws', docId: 'doc' })).toEqual({
      type: SidebarMessageType.OPEN_DOCUMENT,
      workspaceId: 'ws',
      docId: 'doc',
    });
  });

  it('accepts a server url change', () => {
    expect(parseSidebarMessage({ type: SidebarMessageType.SET_SERVER_URL, serverUrl: 'https://app.affine.pro' })).toEqual({
      type: SidebarMessageType.SET_SERVER_URL,
      serverUrl: 'https://app.affine.pro',
    });
  });

  it('accepts delete and move payloads', () => {
    expect(parseSidebarMessage({ type: SidebarMessageType.DELETE_DOCUMENT, workspaceId: 'ws', docId: 'doc' })).toEqual({
      type: SidebarMessageType.DELETE_DOCUMENT,
      workspaceId: 'ws',
      docId: 'doc',
    });
    expect(parseSidebarMessage({ type: SidebarMessageType.MOVE_DOCUMENT, workspaceId: 'ws', docId: 'doc' })).toEqual({
      type: SidebarMessageType.MOVE_DOCUMENT,
      workspaceId: 'ws',
      docId: 'doc',
    });
  });

  it('accepts a force-reload payload', () => {
    expect(parseSidebarMessage({ type: SidebarMessageType.FORCE_RELOAD })).toEqual({ type: SidebarMessageType.FORCE_RELOAD });
  });

  it('accepts create and restore payloads', () => {
    expect(parseSidebarMessage({ type: SidebarMessageType.CREATE_PAGE })).toEqual({ type: SidebarMessageType.CREATE_PAGE });
    expect(parseSidebarMessage({ type: SidebarMessageType.CREATE_FOLDER })).toEqual({ type: SidebarMessageType.CREATE_FOLDER });
    expect(parseSidebarMessage({ type: SidebarMessageType.RESTORE_DOCUMENT })).toEqual({ type: SidebarMessageType.RESTORE_DOCUMENT });
  });

  it('rejects a malformed payload', () => {
    expect(parseSidebarMessage({ type: SidebarMessageType.SIGN_IN_WITH_PASSWORD, email: 'a@b.c' })).toBeUndefined();
    expect(parseSidebarMessage(null)).toBeUndefined();
    expect(parseSidebarMessage({ type: 'unknown' })).toBeUndefined();
  });
});
