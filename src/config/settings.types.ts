import { OpenMode } from '../utils/enums/open-mode.enum';

export { OpenMode };

export interface AffineSettings {
  readonly serverUrl: string;
  readonly defaultWorkspaceId: string | undefined;
  readonly openMode: OpenMode;
  readonly clientVersion: string;
}

export interface RawAffineSettings {
  readonly serverUrl: string;
  readonly defaultWorkspaceId: string;
  readonly openMode: string;
  readonly clientVersion: string;
}

export interface SettingsReader {
  read(): AffineSettings;
}

export interface SettingsWriter {
  writeServerUrl(serverUrl: string): Promise<void>;
}

export interface SettingsStore extends SettingsReader, SettingsWriter {}
