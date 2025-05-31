import React, { useState } from 'react';
import VersionHistory from '../VersionHistory/VersionHistory';
import VersionDiff from '../VersionDiff/VersionDiff';
import { loadVersionData } from '../../services/versionService';
import './VersionControl.css';

const VersionControl = ({ onDataLoad }) => {
  const [selectedVersions, setSelectedVersions] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleVersionSelect = async (backup) => {
    setLoading(true);
    try {
      // Si ya hay dos versiones seleccionadas, reemplazar la más antigua
      const newVersions = [...selectedVersions];
      if (newVersions.length >= 2) {
        newVersions.shift();
      }
      newVersions.push(backup);
      setSelectedVersions(newVersions);

      // Si es la única versión seleccionada, cargar sus datos
      if (newVersions.length === 1 && onDataLoad) {
        // Cargar datos de todas las tablas disponibles
        const tables = backup.tables || [];
        const tableData = {};
        
        for (const table of tables) {
          const data = await loadVersionData(backup.id, table.name);
          tableData[table.name] = data;
        }
        
        onDataLoad(tableData);
      }
    } catch (error) {
      console.error('Error loading version data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTableSelect = (tableName) => {
    setSelectedTable(tableName);
  };

  const renderTableSelector = () => {
    if (!selectedVersions.length) return null;

    const tables = selectedVersions[0].tables || [];
    return (
      <div className="table-selector">
        <h3>Selecciona una tabla para comparar</h3>
        <select 
          value={selectedTable || ''} 
          onChange={(e) => handleTableSelect(e.target.value)}
        >
          <option value="">Selecciona una tabla</option>
          {tables.map(table => (
            <option key={table.name} value={table.name}>
              {table.name} ({table.recordCount} registros)
            </option>
          ))}
        </select>
      </div>
    );
  };

  return (
    <div className="version-control">
      <div className="version-control-header">
        <h2>Control de Versiones</h2>
        {loading && <div className="loading-indicator">Cargando...</div>}
      </div>

      <div className="version-control-content">
        <div className="version-history-section">
          <VersionHistory 
            onVersionSelect={handleVersionSelect}
          />
          {renderTableSelector()}
        </div>

        {selectedVersions.length === 2 && selectedTable && (
          <div className="version-diff-section">
            <VersionDiff
              version1Id={selectedVersions[0].id}
              version2Id={selectedVersions[1].id}
              tableName={selectedTable}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default VersionControl; 