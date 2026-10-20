import { PageBlockKind } from '../utils/enums/page-block-kind.enum';
import { PageListKind } from '../utils/enums/page-list-kind.enum';
import type { PageBlock } from '../yjs/parse-page-doc';
import { numberListItems } from './list-numbering';

function item(list: PageListKind, depth = 0): PageBlock {
  return { kind: PageBlockKind.LIST, list, checked: false, depth, inlines: [] };
}
const paragraph: PageBlock = { kind: PageBlockKind.PARAGRAPH, inlines: [] };

describe('numberListItems', () => {
  it('counts consecutive numbered items from 1', () => {
    const blocks = [item(PageListKind.NUMBERED), item(PageListKind.NUMBERED), item(PageListKind.NUMBERED)];
    expect(numberListItems(blocks)).toEqual([1, 2, 3]);
  });

  it('gives bulleted and to-do items no number', () => {
    expect(numberListItems([item(PageListKind.BULLETED), item(PageListKind.TODO)])).toEqual([undefined, undefined]);
  });

  it('starts again after something that is not a numbered item', () => {
    const blocks = [item(PageListKind.NUMBERED), item(PageListKind.NUMBERED), paragraph, item(PageListKind.NUMBERED)];
    expect(numberListItems(blocks)).toEqual([1, 2, undefined, 1]);
  });

  it('starts again after a bulleted item at the same level', () => {
    const blocks = [item(PageListKind.NUMBERED), item(PageListKind.BULLETED), item(PageListKind.NUMBERED)];
    expect(numberListItems(blocks)).toEqual([1, undefined, 1]);
  });

  it('numbers each nesting level separately and restarts a nested list under a new parent', () => {
    const blocks = [item(PageListKind.NUMBERED, 0), item(PageListKind.NUMBERED, 1), item(PageListKind.NUMBERED, 1), item(PageListKind.NUMBERED, 0), item(PageListKind.NUMBERED, 1)];
    expect(numberListItems(blocks)).toEqual([1, 1, 2, 2, 1]);
  });

  it('handles an empty page', () => {
    expect(numberListItems([])).toEqual([]);
  });
});
