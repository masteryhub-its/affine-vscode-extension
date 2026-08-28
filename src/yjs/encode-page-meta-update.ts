import * as Y from 'yjs';
import { AffineError, AffineErrorCode } from '../errors/affine-error';

export type PageMetaMutator = (pages: Y.Array<Y.Map<unknown>>) => void;

function isYArray(value: unknown): value is Y.Array<Y.Map<unknown>> {
  return value instanceof Y.Array;
}

export function encodePageMetaUpdate(bin: Uint8Array, mutate: PageMetaMutator): Uint8Array {
  const doc = new Y.Doc();
  Y.applyUpdate(doc, bin);
  const vector = Y.encodeStateVector(doc);
  const pages = doc.getMap('meta').get('pages');
  if (!isYArray(pages)) {
    throw new AffineError('Workspace root has no page list', AffineErrorCode.UNEXPECTED_RESPONSE);
  }
  mutate(pages);
  return Y.encodeStateAsUpdate(doc, vector);
}

function mutatePageById(bin: Uint8Array, docId: string, mutate: (page: Y.Map<unknown>) => void): Uint8Array {
  let found = false;
  const update = encodePageMetaUpdate(bin, (pages) => {
    for (const page of pages) {
      if (page.get('id') === docId) {
        mutate(page);
        found = true;
      }
    }
  });
  if (!found) {
    throw new AffineError(`Page ${docId} was not found`, AffineErrorCode.UNEXPECTED_RESPONSE);
  }
  return update;
}

export function encodeTrashPageUpdate(bin: Uint8Array, docId: string): Uint8Array {
  return mutatePageById(bin, docId, (page) => {
    page.set('trash', true);
    page.set('trashedDate', Date.now());
  });
}

export function encodeRestorePageUpdate(bin: Uint8Array, docId: string): Uint8Array {
  return mutatePageById(bin, docId, (page) => {
    page.set('trash', false);
    page.delete('trashedDate');
  });
}

export interface EncodeCreatePageMetaInput {
  readonly docId: string;
  readonly title: string;
}

export function encodeCreatePageMetaUpdate(bin: Uint8Array, input: EncodeCreatePageMetaInput): Uint8Array {
  return encodePageMetaUpdate(bin, (pages) => {
    const item = new Y.Map<unknown>();
    item.set('id', input.docId);
    item.set('title', input.title);
    item.set('createDate', Date.now());
    pages.push([item]);
  });
}

export interface EncodeRenamePageInput {
  readonly docId: string;
  readonly title: string;
}

export function encodeRenamePageUpdate(bin: Uint8Array, input: EncodeRenamePageInput): Uint8Array {
  return mutatePageById(bin, input.docId, (page) => {
    page.set('title', input.title);
  });
}
