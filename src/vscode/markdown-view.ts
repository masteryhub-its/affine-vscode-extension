import * as vscode from 'vscode';
import type { AffineClient } from '../client/affine-client';
import { pageToMarkdown } from '../document/page-to-markdown';

/** Opens a page as Markdown text in a new editor tab beside the current one, so it can be read, searched, copied or diffed. */
export async function openPageAsMarkdown(client: AffineClient, workspaceId: string, docId: string): Promise<void> {
  const preview = await client.loadPagePreview(workspaceId, docId);
  const content = pageToMarkdown(preview.page, { people: preview.mentionPeople });
  const document = await vscode.workspace.openTextDocument({ language: 'markdown', content });
  await vscode.window.showTextDocument(document, { viewColumn: vscode.ViewColumn.Beside, preview: false });
}
