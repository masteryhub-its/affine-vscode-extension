import * as vscode from 'vscode';
import { AffineError, AffineErrorCode } from '../errors/affine-error';
import { isAllowedHttpUrl } from '../utils/allowed-http-url';

export async function openAffineUrl(url: string): Promise<void> {
  if (!isAllowedHttpUrl(url)) {
    throw new AffineError('Only http and https URLs can be opened', AffineErrorCode.INVALID_CONFIG);
  }
  await vscode.env.openExternal(vscode.Uri.parse(url));
}
