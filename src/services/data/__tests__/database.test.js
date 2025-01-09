import { describe, it, expect } from 'vitest';
import databaseService from '../database';

describe('DatabaseService', () => {
  describe('getTables', () => {
    it('should return all available tables', async () => {
      const tables = await databaseService.getTables();
      expect(Array.isArray(tables)).toBe(true);
      expect(tables.length).toBeGreaterThan(0);
      expect(tables).toContainEqual(expect.objectContaining({
        name: 'users'
      }));
    });
  });

  describe('getTableStructure', () => {
    it('should return the structure of a specific table', async () => {
      const structure = await databaseService.getTableStructure('users');
      expect(structure).toEqual(expect.objectContaining({
        name: 'users',
        columns: expect.arrayContaining([
          expect.objectContaining({
            name: 'id',
            type: 'INTEGER',
            isPrimary: true
          })
        ])
      }));
    });

    it('should throw error for non-existent table', async () => {
      await expect(databaseService.getTableStructure('nonexistent'))
        .rejects.toThrow('Table nonexistent not found');
    });
  });

  describe('getData', () => {
    it('should return data from a specific table', async () => {
      const result = await databaseService.getData('users');
      expect(result).toEqual(expect.objectContaining({
        table: 'users',
        columns: expect.any(Array),
        data: expect.any(Array),
        timestamp: expect.any(String)
      }));
    });

    it('should filter data based on provided filters', async () => {
      const result = await databaseService.getData('users', { status: 'Active' });
      expect(result.data.every(row => row.status === 'Active')).toBe(true);
    });
  });

  describe('addTable', () => {
    it('should create a new table with specified columns', async () => {
      const tableName = 'test_table';
      const columns = [
        { name: 'id', type: 'INTEGER', isPrimary: true },
        { name: 'name', type: 'VARCHAR(255)' }
      ];

      const result = await databaseService.addTable(tableName, columns);
      expect(result).toEqual(expect.objectContaining({
        name: tableName,
        columns
      }));

      // Verify table was created
      const tables = await databaseService.getTables();
      expect(tables.some(t => t.name === tableName)).toBe(true);
    });

    it('should throw error when creating duplicate table', async () => {
      await expect(databaseService.addTable('users', []))
        .rejects.toThrow('Table users already exists');
    });
  });

  describe('executeQuery', () => {
    it('should execute SELECT queries', async () => {
      const result = await databaseService.executeQuery('SELECT * FROM users');
      expect(result).toEqual(expect.objectContaining({
        table: 'users',
        data: expect.any(Array)
      }));
    });

    it('should throw error for unsupported query types', async () => {
      await expect(databaseService.executeQuery('INSERT INTO users VALUES (1)'))
        .rejects.toThrow('Only SELECT queries are supported in this version');
    });
  });
}); 