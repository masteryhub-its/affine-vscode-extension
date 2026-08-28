import * as Y from 'yjs';
import { AffineBlockFlavour } from '../utils/enums/affine-block-flavour.enum';
import { AffineParagraphType } from '../utils/enums/affine-paragraph-type.enum';

export interface EncodeEmptyPageDocInput {
  readonly title: string;
  readonly pageId: string;
  readonly noteId: string;
  readonly paragraphId: string;
  readonly surfaceId: string;
}

function setSys(block: Y.Map<unknown>, id: string, flavour: AffineBlockFlavour, children: readonly string[]): void {
  block.set('sys:id', id);
  block.set('sys:flavour', flavour);
  const childIds = new Y.Array<string>();
  if (children.length > 0) {
    childIds.insert(0, [...children]);
  }
  block.set('sys:children', childIds);
}

export function encodeEmptyPageDoc(input: EncodeEmptyPageDocInput): Uint8Array {
  const doc = new Y.Doc();
  const blocks = doc.getMap('blocks');

  const page = new Y.Map<unknown>();
  setSys(page, input.pageId, AffineBlockFlavour.PAGE, [input.surfaceId, input.noteId]);
  const title = new Y.Text();
  title.insert(0, input.title);
  page.set('prop:title', title);
  blocks.set(input.pageId, page);

  const surface = new Y.Map<unknown>();
  setSys(surface, input.surfaceId, AffineBlockFlavour.SURFACE, []);
  blocks.set(input.surfaceId, surface);

  const note = new Y.Map<unknown>();
  setSys(note, input.noteId, AffineBlockFlavour.NOTE, [input.paragraphId]);
  blocks.set(input.noteId, note);

  const paragraph = new Y.Map<unknown>();
  setSys(paragraph, input.paragraphId, AffineBlockFlavour.PARAGRAPH, []);
  paragraph.set('prop:type', AffineParagraphType.TEXT);
  paragraph.set('prop:text', new Y.Text());
  blocks.set(input.paragraphId, paragraph);

  return Y.encodeStateAsUpdate(doc);
}
