import { headingLevel, pageListKind, parseAffineBlockFlavour, parseAffineParagraphType } from './affine-block';
import { AffineBlockFlavour } from './enums/affine-block-flavour.enum';
import { AffineParagraphType } from './enums/affine-paragraph-type.enum';
import { PageListKind } from './enums/page-list-kind.enum';

describe('parseAffineBlockFlavour', () => {
  it('accepts page and paragraph flavours', () => {
    expect(parseAffineBlockFlavour(AffineBlockFlavour.PAGE)).toBe(AffineBlockFlavour.PAGE);
    expect(parseAffineBlockFlavour(AffineBlockFlavour.PARAGRAPH)).toBe(AffineBlockFlavour.PARAGRAPH);
  });

  it('rejects unknown flavours', () => {
    expect(parseAffineBlockFlavour('affine:unknown')).toBeUndefined();
  });
});

describe('headingLevel', () => {
  it('maps heading paragraph types to levels', () => {
    expect(headingLevel(AffineParagraphType.H2)).toBe(2);
    expect(headingLevel(AffineParagraphType.QUOTE)).toBeUndefined();
  });
});

describe('pageListKind', () => {
  it('defaults unknown list types to bulleted', () => {
    expect(pageListKind(PageListKind.TODO)).toBe(PageListKind.TODO);
    expect(pageListKind('unknown')).toBe(PageListKind.BULLETED);
  });
});

describe('parseAffineParagraphType', () => {
  it('accepts text and heading types', () => {
    expect(parseAffineParagraphType(AffineParagraphType.TEXT)).toBe(AffineParagraphType.TEXT);
    expect(parseAffineParagraphType(AffineParagraphType.H1)).toBe(AffineParagraphType.H1);
  });
});
