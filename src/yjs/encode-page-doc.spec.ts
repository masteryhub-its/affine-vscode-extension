import * as Y from 'yjs';
import { parsePageDoc } from './parse-page-doc';
import { encodeEmptyPageDoc } from './encode-page-doc';

describe('encodeEmptyPageDoc', () => {
  it('creates a page document with the given title and an empty paragraph', () => {
    const bin = encodeEmptyPageDoc({
      title: 'New spec',
      pageId: 'page',
      noteId: 'note',
      paragraphId: 'p1',
      surfaceId: 'surface',
    });
    const parsed = parsePageDoc(bin);
    expect(parsed.title).toBe('New spec');
    expect(parsed.edgelessOnly).toBe(false);
    expect(parsed.blocks).toEqual([{ kind: 'paragraph', inlines: [] }]);
  });

  it('includes a surface sibling so AFFiNE can open the page', () => {
    const bin = encodeEmptyPageDoc({
      title: 'New spec',
      pageId: 'page',
      noteId: 'note',
      paragraphId: 'p1',
      surfaceId: 'surface',
    });
    const doc = new Y.Doc();
    Y.applyUpdate(doc, bin);
    const blocks = doc.getMap('blocks');
    expect(blocks.get('surface')).toBeInstanceOf(Y.Map);
  });
});
