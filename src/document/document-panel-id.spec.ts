import { AFFINE_DOCUMENT_VIEW_TYPE, isAffineDocumentViewType } from './document-panel-id';

describe('isAffineDocumentViewType', () => {
  it('matches the AFFiNE preview panel, including a publisher prefix', () => {
    expect(isAffineDocumentViewType(AFFINE_DOCUMENT_VIEW_TYPE)).toBe(true);
    expect(isAffineDocumentViewType(`MasteryHubITS.affine.${AFFINE_DOCUMENT_VIEW_TYPE}`)).toBe(true);
    expect(isAffineDocumentViewType('other.webview')).toBe(false);
  });
});
