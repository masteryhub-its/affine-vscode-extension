import { mkdirSync, writeFileSync } from 'fs';
import { spawnSync } from 'child_process';
import { tmpdir } from 'os';
import { join } from 'path';
import { renderPageHtml } from '../src/document/render-page-html';
import { renderSidebarHtml } from '../src/sidebar/sidebar-html';
import { previewPageHtmlInput, signedInSidebarHtmlInput, signedOutSidebarHtmlInput } from '../src/media/screenshot-fixtures';
import { MARKETPLACE_SHOT_HEIGHT, MARKETPLACE_SHOT_WIDTH, wrapMarketplaceFrame } from '../src/media/screenshot-frame';
import { MarketplaceShotName } from '../src/utils/enums/marketplace-shot-name.enum';

interface CaptureShotInput {
  readonly name: MarketplaceShotName;
  readonly html: string;
  readonly outDir: string;
}

function findChrome(): string {
  const candidates = ['/usr/bin/chromium', '/usr/bin/google-chrome', '/usr/bin/chromium-browser', '/usr/bin/google-chrome-stable'];
  for (const candidate of candidates) {
    const probe = spawnSync(candidate, ['--version'], { encoding: 'utf8' });
    if (probe.status === 0) {
      return candidate;
    }
  }
  throw new Error('No Chromium/Chrome binary found for marketplace screenshots');
}

function captureShot(input: CaptureShotInput, chrome: string): void {
  const workDir = join(tmpdir(), 'affine-marketplace-screenshots');
  mkdirSync(workDir, { recursive: true });
  const htmlPath = join(workDir, `${input.name}.html`);
  const pngPath = join(input.outDir, `${input.name}.png`);
  writeFileSync(htmlPath, input.html);
  const result = spawnSync(
    chrome,
    [
      '--headless=new',
      '--disable-gpu',
      '--no-sandbox',
      '--hide-scrollbars',
      '--force-device-scale-factor=1',
      `--window-size=${MARKETPLACE_SHOT_WIDTH},${MARKETPLACE_SHOT_HEIGHT}`,
      `--screenshot=${pngPath}`,
      `file://${htmlPath}`,
    ],
    { encoding: 'utf8' }
  );
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `chromium exited ${String(result.status)}`);
  }
}

function main(): void {
  const outDir = join(process.cwd(), 'media', 'screenshots');
  mkdirSync(outDir, { recursive: true });
  const chrome = findChrome();
  const signedIn = renderSidebarHtml(signedInSidebarHtmlInput());
  const signedOut = renderSidebarHtml(signedOutSidebarHtmlInput());
  const preview = renderPageHtml(previewPageHtmlInput());
  captureShot({ name: MarketplaceShotName.SIDEBAR, html: wrapMarketplaceFrame({ kind: MarketplaceShotName.SIDEBAR, sidebarHtml: signedIn, previewHtml: undefined }), outDir }, chrome);
  captureShot({ name: MarketplaceShotName.PREVIEW, html: wrapMarketplaceFrame({ kind: MarketplaceShotName.PREVIEW, sidebarHtml: signedIn, previewHtml: preview }), outDir }, chrome);
  captureShot({ name: MarketplaceShotName.SIGN_IN, html: wrapMarketplaceFrame({ kind: MarketplaceShotName.SIGN_IN, sidebarHtml: signedOut, previewHtml: undefined }), outDir }, chrome);
}

main();
