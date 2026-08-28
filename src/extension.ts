import type * as vscode from 'vscode';
import { activateAffine } from './vscode/activate';

export function activate(context: vscode.ExtensionContext): void {
  activateAffine(context);
}

export function deactivate(): void {
  return;
}
