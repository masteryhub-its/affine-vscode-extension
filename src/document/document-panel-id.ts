export const AFFINE_DOCUMENT_VIEW_TYPE = 'affineDocument';

export function isAffineDocumentViewType(viewType: string): boolean {
  return viewType === AFFINE_DOCUMENT_VIEW_TYPE || viewType.endsWith(`.${AFFINE_DOCUMENT_VIEW_TYPE}`);
}
