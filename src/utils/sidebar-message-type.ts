import { SidebarMessageType } from './enums/sidebar-message-type.enum';

const SIDEBAR_MESSAGE_TYPE_VALUES: ReadonlySet<string> = new Set(Object.values(SidebarMessageType));

export function parseSidebarMessageType(value: unknown): SidebarMessageType | undefined {
  if (typeof value !== 'string' || !SIDEBAR_MESSAGE_TYPE_VALUES.has(value)) {
    return undefined;
  }
  return value as SidebarMessageType;
}
