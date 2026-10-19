import { randomBytes } from 'crypto';
import * as vscode from 'vscode';
import type { AffineClient } from '../client/affine-client';
import { buildDocumentUrl } from '../client/document-url';
import { AFFINE_DOCUMENT_VIEW_TYPE, documentPanelKey, isAffineDocumentViewType } from '../document/document-panel-id';
import { renderPageErrorHtml, renderPageHtml, renderPageLoadingHtml } from '../document/render-page-html';
import { formatAffineError } from '../errors/format-error';
import { DocumentPanelMessageType } from '../utils/enums/document-panel-message-type.enum';
import { parseDocumentPanelMessageType } from '../utils/document-panel-message-type';
import { isAllowedHttpUrl } from '../utils/allowed-http-url';
import { openAffineUrl } from './open-url';

export interface OpenAffineDocumentInput {
  readonly client: AffineClient;
  readonly serverUrl: string;
  readonly workspaceId: string;
  readonly docId: string;
  readonly title: string;
  readonly tags?: readonly string[] | undefined;
}

const openPanels = new Map<string, vscode.WebviewPanel>();

export async function openAffineDocumentPanel(input: OpenAffineDocumentInput): Promise<void> {
  const url = buildDocumentUrl(input.serverUrl, input.workspaceId, input.docId);
  const panelKey = documentPanelKey(input.workspaceId, input.docId);
  const existing = openPanels.get(panelKey);
  if (existing !== undefined) {
    existing.reveal(vscode.ViewColumn.One);
    return;
  }
  const panel = vscode.window.createWebviewPanel(AFFINE_DOCUMENT_VIEW_TYPE, input.title, vscode.ViewColumn.One, {
    enableScripts: true,
    retainContextWhenHidden: true,
    localResourceRoots: [],
  });
  openPanels.set(panelKey, panel);
  let disposed = false;
  panel.onDidDispose(() => {
    disposed = true;
    openPanels.delete(panelKey);
  });
  const nonce = randomBytes(16).toString('hex');
  const cspSource = panel.webview.cspSource;
  panel.webview.html = renderPageLoadingHtml({ title: input.title, nonce, cspSource, serverUrl: input.serverUrl });
  panel.webview.onDidReceiveMessage((message: unknown) => {
    const href = panelHref(message);
    if (href !== undefined) {
      void openAffineUrl(href);
      return;
    }
    if (isOpenExternalMessage(message)) {
      void openAffineUrl(url);
    }
  });
  try {
    const preview = await input.client.loadPagePreview(input.workspaceId, input.docId);
    if (disposed) {
      return;
    }
    panel.webview.html = renderPageHtml({
      page: preview.page,
      fallbackTitle: input.title,
      url,
      nonce,
      cspSource,
      createdBy: preview.createdBy,
      updatedBy: preview.updatedBy,
      mentionPeople: preview.mentionPeople,
      ...(input.tags === undefined ? {} : { tags: input.tags }),
    });
    panel.title = preview.page.title.trim().length > 0 ? preview.page.title : input.title;
  } catch (error: unknown) {
    if (disposed) {
      return;
    }
    panel.webview.html = renderPageErrorHtml({
      title: input.title,
      message: formatAffineError(error),
      url,
      nonce,
      cspSource,
      serverUrl: input.serverUrl,
    });
  }
}

export async function closeAffineDocumentPanels(): Promise<void> {
  const tabs: vscode.Tab[] = [];
  for (const group of vscode.window.tabGroups.all) {
    for (const tab of group.tabs) {
      if (tab.input instanceof vscode.TabInputWebview && isAffineDocumentViewType(tab.input.viewType)) {
        tabs.push(tab);
      }
    }
  }
  if (tabs.length === 0) {
    return;
  }
  await vscode.window.tabGroups.close(tabs);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isOpenExternalMessage(value: unknown): boolean {
  return isRecord(value) && parseDocumentPanelMessageType(value['type']) === DocumentPanelMessageType.OPEN_EXTERNAL;
}

function panelHref(value: unknown): string | undefined {
  if (!isRecord(value) || parseDocumentPanelMessageType(value['type']) !== DocumentPanelMessageType.OPEN_HREF || typeof value['href'] !== 'string') {
    return undefined;
  }
  return isAllowedHttpUrl(value['href']) ? value['href'] : undefined;
}
