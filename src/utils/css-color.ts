const HEX = /^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/u;
const RGB = /^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\)$/u;
const CSS_VAR = /^var\(--[a-zA-Z0-9-]+(?:\s*,\s*(?:#[0-9a-fA-F]{3,8}|rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\)))?\)$/u;
const CUSTOM_PROP = /^--[a-zA-Z0-9-]+$/u;

export function parseCssColor(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return undefined;
  }
  if (HEX.test(trimmed) || RGB.test(trimmed) || CSS_VAR.test(trimmed)) {
    return trimmed;
  }
  if (CUSTOM_PROP.test(trimmed)) {
    return `var(${trimmed})`;
  }
  return undefined;
}
