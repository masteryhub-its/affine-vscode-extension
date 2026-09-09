import { AFFINE_CLOUD_URL, AFFINE_SERVER_PRESETS, selectedServerPresetId } from './server-presets';
import { AffineServerPresetId } from '../utils/enums/affine-server-preset-id.enum';

describe('AFFINE_SERVER_PRESETS', () => {
  it('ships AFFiNE Cloud as the only named preset', () => {
    expect(AFFINE_CLOUD_URL).toBe('https://app.affine.pro');
    expect(AFFINE_SERVER_PRESETS).toEqual([{ id: AffineServerPresetId.CLOUD, label: 'AFFiNE Cloud', url: AFFINE_CLOUD_URL }]);
  });
});

describe('selectedServerPresetId', () => {
  it('matches the Cloud preset url', () => {
    expect(selectedServerPresetId('https://app.affine.pro')).toBe(AffineServerPresetId.CLOUD);
  });

  it('treats any other host as custom self-hosted', () => {
    expect(selectedServerPresetId('https://affine.example.com')).toBe(AffineServerPresetId.CUSTOM);
  });
});
