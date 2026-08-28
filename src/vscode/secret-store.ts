import type { SecretStore } from '../client/affine.types';
import type * as vscode from 'vscode';

export class VsCodeSecretStore implements SecretStore {
  public constructor(private readonly secrets: vscode.SecretStorage) {}

  public async get(key: string): Promise<string | undefined> {
    const value = await this.secrets.get(key);
    return value;
  }

  public async store(key: string, value: string): Promise<void> {
    await this.secrets.store(key, value);
  }

  public async delete(key: string): Promise<void> {
    await this.secrets.delete(key);
  }
}
