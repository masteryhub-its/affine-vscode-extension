import { AFFINE_DOCUMENT_VIEW_TYPE, documentPanelKey, isAffineDocumentViewType } from './document-panel-id';

describe('isAffineDocumentViewType', () => {
  it('matches the AFFiNE preview panel, including a publisher prefix', () => {
    expect(isAffineDocumentViewType(AFFINE_DOCUMENT_VIEW_TYPE)).toBe(true);
    expect(isAffineDocumentViewType(`MasteryHubITS.affine.${AFFINE_DOCUMENT_VIEW_TYPE}`)).toBe(true);
    expect(isAffineDocumentViewType('other.webview')).toBe(false);
  });
});

describe('documentPanelKey', () => {
  it('is stable for the same page', () => {
    expect(documentPanelKey('w1', 'd1')).toBe(documentPanelKey('w1', 'd1'));
  });

  it('differs per page and per workspace', () => {
    expect(documentPanelKey('w1', 'd1')).not.toBe(documentPanelKey('w1', 'd2'));
    expect(documentPanelKey('w1', 'd1')).not.toBe(documentPanelKey('w2', 'd1'));
  });

  it('does not confuse ids that only differ by where the boundary falls', () => {
    expect(documentPanelKey('ab', 'c')).not.toBe(documentPanelKey('a', 'bc'));
  });
});
