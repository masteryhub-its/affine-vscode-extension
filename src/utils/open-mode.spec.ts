import { OpenMode } from './enums/open-mode.enum';
import { parseOpenMode } from './open-mode';

describe('parseOpenMode', () => {
  it('accepts external', () => {
    expect(parseOpenMode(OpenMode.EXTERNAL)).toBe(OpenMode.EXTERNAL);
  });

  it('rejects modes that have no AFFiNE session', () => {
    expect(parseOpenMode('simpleBrowser')).toBeUndefined();
    expect(parseOpenMode('iframe')).toBeUndefined();
  });
});
