import React, { useState, useEffect } from 'react';
import DataTable from '../DataDisplay/DataTable';
import AddEntryModal from './AddEntryModal';
import firebaseTableService from '../../services/firebaseTableService';
import { useTeam } from '../../context/TeamContext';
import { getCleanTeamName } from '../../utils/teamUtils';
import './DataSection.css';
import { toast } from 'react-hot-toast';

const DataSection = () => {
  const { userTeam, currentTeam } = useTeam();
  const team = currentTeam || userTeam;
  
  const [selectedTable, setSelectedTable] = useState(null);
  const [tableData, setTableData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddEntryModal, setShowAddEntryModal] = useState(false);
  const [tables, setTables] = useState([]);
  const [error, setError] = useState(null);
  const [isLoadingTables, setIsLoadingTables] = useState(true);

  // Load tables on mount - SIMPLE VERSION
  useEffect(() => {
    const loadTables = async () => {
      try {
        setIsLoadingTables(true);
        console.log('🔥 Loading tables from Firebase...');
        const tablesData = await firebaseTableService.getTables();
        console.log('🔥 Received tables:', tablesData);
        
        // Hide specific tables from dropdown
        const hiddenTables = [
          'emant_caratula',
          'emant_listado', 
          'gruposautos',
          'gruposvida',
          'listadoautos',
          'listadovida'
        ];
        
        // Filter out hidden tables
        const visibleTables = tablesData.filter(table => 
          !hiddenTables.includes(table.name)
        );
        
        // Custom order: autos, gmm, hogar, vida, then the rest
        const priorityOrder = ['autos', 'gmm', 'hogar', 'vida'];
        
        const priorityTables = [];
        const otherTables = [];
        
        visibleTables.forEach(table => {
          if (priorityOrder.includes(table.name)) {
            priorityTables.push(table);
          } else {
            otherTables.push(table);
          }
        });
        
        // Sort priority tables by the defined order
        priorityTables.sort((a, b) => {
          return priorityOrder.indexOf(a.name) - priorityOrder.indexOf(b.name);
        });
        
        // Sort other tables alphabetically
        otherTables.sort((a, b) => a.name.localeCompare(b.name));
        
        // Combine: priority first, then others
        const orderedTables = [...priorityTables, ...otherTables];
        console.log('🔧 Tables ordered:', orderedTables.map(t => t.name));
        
        setTables(orderedTables);
      } catch (error) {
        console.error('❌ Error loading tables:', error);
        setError('Error loading tables: ' + error.message);
      } finally {
        setIsLoadingTables(false);
      }
    };
    
    loadTables();
  }, []);


  // Load table data when table is selected - SIMPLE VERSION
  const handleTableSelect = async (tableName) => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('🔥 Loading data for table:', tableName);
      const result = await firebaseTableService.getData(tableName);
      console.log('🔥 Received data:', result);
      
      if (result && result.data) {
        setTableData(result.data);
        setSelectedTable({ name: tableName, title: result.title || tableName });
        console.log(`✅ Loaded ${result.data.length} records for ${tableName}`);
      } else {
        console.warn('⚠️ No data received for table:', tableName);
        setTableData([]);
      }
    } catch (error) {
      console.error('❌ Error loading table data:', error);
      setError('Error loading table data: ' + error.message);
      setTableData([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle data update
  const handleDataUpdate = (updatedData) => {
    setTableData(updatedData);
  };

  // Handle cell update
  const handleCellUpdate = async (rowId, column, newValue) => {
    try {
      console.log('🔄 DataSection: Updating cell:', { 
        tableName: selectedTable?.name, 
        rowId, 
        column, 
        newValue,
        firebaseTableService: typeof firebaseTableService,
        updateData: typeof firebaseTableService?.updateData
      });
      
      // Validate inputs
      if (!selectedTable?.name) {
        throw new Error('No table selected');
      }
      if (!rowId) {
        throw new Error('No row ID provided');
      }
      if (!column) {
        throw new Error('No column provided');
      }
      
      // Update the cell using firebaseTableService
      console.log('🔄 Calling firebaseTableService.updateData...');
      const result = await firebaseTableService.updateData(selectedTable.name, rowId, column, newValue);
      console.log('🔄 Update result:', result);
      
      if (result && result.success) {
        // Update local state
        setTableData(prevData => 
          prevData.map(row => 
            row.id === rowId ? { ...row, [column]: newValue } : row
          )
        );
        
        console.log('✅ DataSection: Cell updated successfully');
        return { success: true };
      } else {
        throw new Error(result?.message || 'Failed to update cell');
      }
    } catch (error) {
      console.error('❌ DataSection: Error updating cell:', error);
      console.error('❌ Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      throw error;
    }
  };

  // Handle refresh
  const handleRefresh = async (tableName = null) => {
    const tableToRefresh = tableName || selectedTable?.name;
    if (tableToRefresh) {
      await handleTableSelect(tableToRefresh);
    }
  };

  // Handle new entry
  const handleNewEntry = (newEntry) => {
    setTableData(prev => [newEntry, ...prev]);
    toast.success('Nuevo registro agregado');
  };

  // Handle export
  const handleExport = () => {
    if (!selectedTable || !tableData.length) return;
    
    const csvContent = [
      Object.keys(tableData[0]).join(','),
      ...tableData.map(row => Object.values(row).map(value => 
        typeof value === 'string' && value.includes(',') ? `"${value}"` : value
      ).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedTable?.name || 'data'}_export.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="data-section excel-layout">
      {/* Toolbar - Only show when table is selected */}
      {selectedTable && (
        <div className="excel-toolbar">
          {/* Left Section - Team Info */}
          <div className="toolbar-left">
            {team && (
              <span className="team-badge">🏢 {getCleanTeamName(team.name)}</span>
            )}
          </div>

          {/* Center Section - Table Selection */}
          <div className="toolbar-center">
            <div className="table-selector-compact">
              {/* Simple Dropdown */}
              <div className="dropdown-container">
                <select
                  className="table-select-dropdown"
                  value={selectedTable ? selectedTable.name : ''}
                  onChange={e => {
                    const tableName = e.target.value;
                    if (tableName) handleTableSelect(tableName);
                  }}
                >
                  <option value="" disabled>📋 Selecciona una tabla</option>
                  {tables.map(table => (
                    <option key={table.name} value={table.name}>
                      {table.name}
                    </option>
                  ))}
                </select>
                <div className="dropdown-arrow">▼</div>
              </div>
            </div>
          </div>

          {/* Right Section - Actions */}
          <div className="toolbar-right">
            <button 
              className="toolbar-btn add-btn" 
              onClick={() => setShowAddEntryModal(true)}
              disabled={isLoading}
              title="Captura Manual"
            >
              <span className="btn-icon">➕</span>
              <span className="btn-text">Captura Manual</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="main-content">
        {error && (
          <div className="error-message">
            <p>❌ {error}</p>
            <button onClick={() => setError(null)}>Cerrar</button>
          </div>
        )}

        {selectedTable ? (
          <div className="table-container">
            <DataTable
              data={tableData}
              tableName={selectedTable.name}
              onDataUpdate={handleDataUpdate}
              onCellUpdate={handleCellUpdate}
              onRefresh={handleRefresh}
              isLoading={isLoading}
            />
          </div>
        ) : isLoadingTables ? (
          <div className="table-selection-view">
            <div className="selection-header">
              <h2>Cargando Tablas</h2>
              <p>Obteniendo las tablas disponibles...</p>
            </div>
            
            <div className="tables-loading">
              <div className="loading-spinner"></div>
              <p className="loading-text">Cargando...</p>
            </div>
          </div>
        ) : (
          <div className="table-selection-view">
            <div className="selection-header">
              <h2>Selecciona una Tabla</h2>
              <p>Elige la tabla con la que deseas trabajar</p>
            </div>
            
            <div className="tables-grid">
              {tables.map(table => (
                <button
                  key={table.name}
                  className="table-card"
                  onClick={() => handleTableSelect(table.name)}
                  disabled={isLoading}
                >
                  <div className="table-card-icon">📊</div>
                  <div className="table-card-name">{table.name}</div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showAddEntryModal && selectedTable && (
        <AddEntryModal
          tableName={selectedTable.name}
          onClose={() => setShowAddEntryModal(false)}
          onSuccess={handleNewEntry}
        />
      )}
    </div>
  );
};

export default DataSection;