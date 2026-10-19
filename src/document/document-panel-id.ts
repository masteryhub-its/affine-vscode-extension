export const AFFINE_DOCUMENT_VIEW_TYPE = 'affineDocument';

export function isAffineDocumentViewType(viewType: string): boolean {
  return viewType === AFFINE_DOCUMENT_VIEW_TYPE || viewType.endsWith(`.${AFFINE_DOCUMENT_VIEW_TYPE}`);
}

/** Identifies one page so a second open focuses the existing panel instead of adding another. */
export function documentPanelKey(workspaceId: string, docId: string): string {
  return `${workspaceId}\u0000${docId}`;
}
