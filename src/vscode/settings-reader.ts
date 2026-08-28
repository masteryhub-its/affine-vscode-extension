import * as vscode from 'vscode';
import { DEFAULT_CLIENT_VERSION, DEFAULT_OPEN_MODE, DEFAULT_SERVER_URL } from '../constants';
import { normalizeServerUrl, normalizeSettings, preferredServerUrlRaw } from '../config/settings';
import type { AffineSettings, SettingsStore } from '../config/settings.types';

function readString(config: vscode.WorkspaceConfiguration, key: string, fallback: string): string {
  const value = config.get<unknown>(key);
  return typeof value === 'string' ? value : fallback;
}

function inspectedString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

export class VsCodeSettingsReader implements SettingsStore {
  public read(): AffineSettings {
    const config = vscode.workspace.getConfiguration('affine');
    const inspected = config.inspect<unknown>('serverUrl');
    const serverUrlRaw = preferredServerUrlRaw({
      globalValue: inspectedString(inspected?.globalValue),
      defaultValue: inspectedString(inspected?.defaultValue) ?? DEFAULT_SERVER_URL,
      workspaceValue: inspectedString(inspected?.workspaceValue),
      workspaceFolderValue: inspectedString(inspected?.workspaceFolderValue),
    });
    return normalizeSettings({
      serverUrl: serverUrlRaw,
      defaultWorkspaceId: readString(config, 'defaultWorkspaceId', ''),
      openMode: readString(config, 'openMode', DEFAULT_OPEN_MODE),
      clientVersion: readString(config, 'clientVersion', DEFAULT_CLIENT_VERSION),
    });
  }

  public async writeServerUrl(serverUrl: string): Promise<void> {
    await vscode.workspace.getConfiguration('affine').update('serverUrl', normalizeServerUrl(serverUrl), vscode.ConfigurationTarget.Global);
  }
}
