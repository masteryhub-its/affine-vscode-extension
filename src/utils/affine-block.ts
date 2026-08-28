import { AffineBlockFlavour } from './enums/affine-block-flavour.enum';
import { AffineNoteDisplayMode } from './enums/affine-note-display-mode.enum';
import { AffineParagraphType } from './enums/affine-paragraph-type.enum';
import { AffineReferenceType } from './enums/affine-reference-type.enum';
import { PageListKind } from './enums/page-list-kind.enum';
import type { HeadingLevel } from './heading-level';

const AFFINE_BLOCK_FLAVOUR_VALUES: ReadonlySet<string> = new Set(Object.values(AffineBlockFlavour));
const AFFINE_PARAGRAPH_TYPE_VALUES: ReadonlySet<string> = new Set(Object.values(AffineParagraphType));
const PAGE_LIST_KIND_VALUES: ReadonlySet<string> = new Set(Object.values(PageListKind));
const AFFINE_NOTE_DISPLAY_MODE_VALUES: ReadonlySet<string> = new Set(Object.values(AffineNoteDisplayMode));
const AFFINE_REFERENCE_TYPE_VALUES: ReadonlySet<string> = new Set(Object.values(AffineReferenceType));

export function parseAffineBlockFlavour(value: string): AffineBlockFlavour | undefined {
  if (!AFFINE_BLOCK_FLAVOUR_VALUES.has(value)) {
    return undefined;
  }
  return value as AffineBlockFlavour;
}

export function parseAffineParagraphType(value: string): AffineParagraphType | undefined {
  if (!AFFINE_PARAGRAPH_TYPE_VALUES.has(value)) {
    return undefined;
  }
  return value as AffineParagraphType;
}

export function parsePageListKind(value: string): PageListKind | undefined {
  if (!PAGE_LIST_KIND_VALUES.has(value)) {
    return undefined;
  }
  return value as PageListKind;
}

export function parseAffineNoteDisplayMode(value: string): AffineNoteDisplayMode | undefined {
  if (!AFFINE_NOTE_DISPLAY_MODE_VALUES.has(value)) {
    return undefined;
  }
  return value as AffineNoteDisplayMode;
}

export function parseAffineReferenceType(value: unknown): AffineReferenceType | undefined {
  if (typeof value !== 'string' || !AFFINE_REFERENCE_TYPE_VALUES.has(value)) {
    return undefined;
  }
  return value as AffineReferenceType;
}

export function headingLevel(type: AffineParagraphType): HeadingLevel | undefined {
  switch (type) {
    case AffineParagraphType.H1:
      return 1;
    case AffineParagraphType.H2:
      return 2;
    case AffineParagraphType.H3:
      return 3;
    case AffineParagraphType.H4:
      return 4;
    case AffineParagraphType.H5:
      return 5;
    case AffineParagraphType.H6:
      return 6;
    case AffineParagraphType.TEXT:
    case AffineParagraphType.QUOTE:
      return undefined;
  }
}

export function pageListKind(type: string): PageListKind {
  return parsePageListKind(type) ?? PageListKind.BULLETED;
}
