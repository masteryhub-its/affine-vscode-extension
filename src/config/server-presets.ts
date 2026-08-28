import { AffineServerPresetId } from '../utils/enums/affine-server-preset-id.enum';

export const AFFINE_CLOUD_URL = 'https://app.affine.pro';

export interface AffineServerPreset {
  readonly id: AffineServerPresetId;
  readonly label: string;
  readonly url: string;
}

export const AFFINE_SERVER_PRESETS: readonly AffineServerPreset[] = [
  { id: AffineServerPresetId.MASTERYHUB, label: 'MasteryHub', url: 'https://affine.masteryhub-its.com' },
  { id: AffineServerPresetId.CLOUD, label: 'AFFiNE Cloud', url: AFFINE_CLOUD_URL },
];

export function selectedServerPresetId(serverUrl: string): AffineServerPresetId {
  const match = AFFINE_SERVER_PRESETS.find((preset) => preset.url === serverUrl);
  return match === undefined ? AffineServerPresetId.CUSTOM : match.id;
}
