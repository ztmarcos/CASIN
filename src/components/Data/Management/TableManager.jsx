import React, { useState, useEffect } from 'react';
import databaseService from '../../../services/data/database';
import './TableManager.css';

const TableManager = () => {
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [newTableName, setNewTableName] = useState('');
  const [tableData, setTableData] = useState(null);

  useEffect(() => {
    loadTables();
  }, []);

  const loadTables = async () => {
    try {
      const tablesData = await databaseService.getTables();
      setTables(tablesData);
      console.log('Loaded tables:', tablesData); // Debug log
    } catch (error) {
      console.error('Error loading tables:', error);
    }
  };

  const handleTableSelect = async (tableName) => {
    try {
      const structure = await databaseService.getTableStructure(tableName);
      setSelectedTable(structure);
      const data = await databaseService.getData(tableName);
      setTableData(data);
      console.log('Selected table data:', data); // Debug log
    } catch (error) {
      console.error('Error loading table structure:', error);
    }
  };

  const handleAddTable = async (e) => {
    e.preventDefault();
    if (!newTableName.trim()) return;

    try {
      await databaseService.addTable(newTableName, [
        { name: 'id', type: 'INTEGER', isPrimary: true },
        { name: 'name', type: 'VARCHAR(255)' },
        { name: 'created_at', type: 'TIMESTAMP' }
      ]);
      setNewTableName('');
      await loadTables();
    } catch (error) {
      console.error('Error adding table:', error);
    }
  };

  return (
    <div className="table-manager">
      <div className="tables-section">
        <h3>Tables</h3>
        <div className="tables-list">
          {tables.map(table => (
            <div
              key={table.name}
              className={`table-item ${selectedTable?.name === table.name ? 'selected' : ''}`}
              onClick={() => handleTableSelect(table.name)}
            >
              {table.name}
            </div>
          ))}
        </div>

        <form onSubmit={handleAddTable} className="add-table-form">
          <input
            type="text"
            value={newTableName}
            onChange={(e) => setNewTableName(e.target.value)}
            placeholder="New table name"
            className="input-field"
          />
          <button type="submit" className="btn-primary">Add Table</button>
        </form>
      </div>

      {selectedTable && (
        <div className="table-structure">
          <h3>{selectedTable.name} Structure</h3>
          <div className="columns-list">
            {selectedTable.columns.map(column => (
              <div key={column.name} className="column-item">
                <span className="column-name">{column.name}</span>
                <span className="column-type">{column.type}</span>
                {column.isPrimary && <span className="primary-key">PK</span>}
              </div>
            ))}
          </div>

          {tableData && (
            <div className="table-data">
              <h3>Data Preview</h3>
              <div className="data-grid">
                <table>
                  <thead>
                    <tr>
                      {selectedTable.columns.map(column => (
                        <th key={column.name}>{column.name}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tableData.data.map((row, index) => (
                      <tr key={index}>
                        {selectedTable.columns.map(column => (
                          <td key={column.name}>{row[column.name]}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TableManager; 