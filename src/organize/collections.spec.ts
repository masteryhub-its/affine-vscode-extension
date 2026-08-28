import { parseCollections } from './collections';
import { OrganizeRecordType } from '../utils/enums/organize-record-type.enum';

describe('parseCollections', () => {
  it('groups document rows under collection records', () => {
    const collections = parseCollections([
      { id: 'c1', parentId: null, type: OrganizeRecordType.COLLECTION, data: 'Specs', index: 'a0' },
      { id: 'd1', parentId: 'c1', type: OrganizeRecordType.DOC, data: 'page-1', index: 'a0' },
      { id: 'f1', parentId: null, type: OrganizeRecordType.FOLDER, data: 'Product', index: 'a1' },
    ]);
    expect(collections).toEqual([{ id: 'c1', title: 'Specs', docIds: ['page-1'] }]);
  });
});
