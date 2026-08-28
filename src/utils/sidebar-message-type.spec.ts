import { SidebarMessageType } from './enums/sidebar-message-type.enum';
import { parseSidebarMessageType } from './sidebar-message-type';

describe('parseSidebarMessageType', () => {
  it('accepts host message types', () => {
    expect(parseSidebarMessageType(SidebarMessageType.SIGN_IN_WITH_TOKEN)).toBe(SidebarMessageType.SIGN_IN_WITH_TOKEN);
    expect(parseSidebarMessageType(SidebarMessageType.OPEN_DOCUMENT)).toBe(SidebarMessageType.OPEN_DOCUMENT);
  });

  it('rejects unknown types', () => {
    expect(parseSidebarMessageType('unknown')).toBeUndefined();
  });
});
