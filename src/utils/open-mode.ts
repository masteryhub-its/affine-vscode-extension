import { OpenMode } from './enums/open-mode.enum';

const OPEN_MODE_VALUES: ReadonlySet<string> = new Set(Object.values(OpenMode));

export function parseOpenMode(value: string): OpenMode | undefined {
  if (!OPEN_MODE_VALUES.has(value)) {
    return undefined;
  }
  return value as OpenMode;
}
