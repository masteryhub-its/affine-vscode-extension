import { AFFINE_CLOUD_URL, AFFINE_SERVER_PRESETS, selectedServerPresetId } from './server-presets';
import { AffineServerPresetId } from '../utils/enums/affine-server-preset-id.enum';

describe('AFFINE_SERVER_PRESETS', () => {
  it('includes AFFiNE Cloud and the MasteryHub self-hosted instance', () => {
    expect(AFFINE_CLOUD_URL).toBe('https://app.affine.pro');
    expect(AFFINE_SERVER_PRESETS.map((preset) => preset.id)).toEqual([AffineServerPresetId.MASTERYHUB, AffineServerPresetId.CLOUD]);
  });
});

describe('selectedServerPresetId', () => {
  it('matches a known preset url', () => {
    expect(selectedServerPresetId('https://app.affine.pro')).toBe(AffineServerPresetId.CLOUD);
    expect(selectedServerPresetId('https://affine.masteryhub-its.com')).toBe(AffineServerPresetId.MASTERYHUB);
  });

  it('treats any other host as custom self-hosted', () => {
    expect(selectedServerPresetId('https://affine.example.com')).toBe(AffineServerPresetId.CUSTOM);
  });
});
