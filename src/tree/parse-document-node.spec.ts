import { parseDocumentNode, toDocumentNode } from './tree-model';
import { AffineTreeKind } from '../utils/enums/affine-tree-kind.enum';

describe('parseDocumentNode', () => {
  it('accepts a document tree node', () => {
    const node = toDocumentNode({ id: 'd1', workspaceId: 'ws', title: 'Spec', updatedAt: null });
    expect(parseDocumentNode(node)).toEqual(node);
  });

  it('rejects a workspace node', () => {
    expect(parseDocumentNode({ kind: AffineTreeKind.WORKSPACE, id: 'ws', label: 'Workspace ws' })).toBeUndefined();
  });

  it('rejects unrelated values', () => {
    expect(parseDocumentNode(null)).toBeUndefined();
    expect(parseDocumentNode('doc')).toBeUndefined();
  });
});
