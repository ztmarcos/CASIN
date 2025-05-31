import tableService from '../tableService';

describe('TableService', () => {
  test('getTables should return list of tables', async () => {
    const tables = await tableService.getTables();
    expect(Array.isArray(tables)).toBe(true);
  });

  test('getData should return table data', async () => {
    const data = await tableService.getData('users');
    expect(data).toHaveProperty('data');
    expect(Array.isArray(data.data)).toBe(true);
  });
}); 