import * as vscode from 'vscode';
import { formatAffineError } from '../errors/format-error';

export function showAffineError(error: unknown): void {
  void vscode.window.showErrorMessage(formatAffineError(error));
}

export function showAffineInfo(message: string): void {
  void vscode.window.showInformationMessage(message);
}
