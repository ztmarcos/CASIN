import React, { useState, useEffect } from 'react';
import tableService from '../../services/data/tableService';
import './GPTAnalysis.css';

const GPTAnalysis = ({ parsedData, tables }) => {
    const [analysis, setAnalysis] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [dbTables, setDbTables] = useState([]);
    const [selectedTable, setSelectedTable] = useState('');
    const [mappedData, setMappedData] = useState(null);
    const [message, setMessage] = useState(null);

    // Fetch available tables and their columns
    useEffect(() => {
        const fetchTables = async () => {
            try {
                const tables = await tableService.getTables();
                setDbTables(tables);
            } catch (err) {
                console.error('Error fetching tables:', err);
                setError('Failed to fetch database tables');
            }
        };
        fetchTables();
    }, []);

    const handleTableSelect = (tableName) => {
        console.log('Selected table name:', tableName);
        setSelectedTable(tableName);
    };

    const analyzeContent = async () => {
        if (!selectedTable) {
            setError('Please select a target table first');
            return;
        }

        setLoading(true);
        setError(null);
        
        try {
            // Get selected table columns
            const targetTable = dbTables.find(t => t.name === selectedTable);
            if (!targetTable) {
                throw new Error('Selected table not found');
            }

            const columns = targetTable.columns.map(col => col.name);
            console.log('Analyzing with columns:', columns); // Debug log

            const response = await fetch('http://localhost:3001/api/gpt/analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text: parsedData.text,
                    tables: tables,
                    metadata: parsedData.metadata,
                    targetColumns: columns,
                    tableName: selectedTable
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to analyze content');
            }

            const result = await response.json();
            console.log('Full Analysis Result:', JSON.stringify(result, null, 2)); // Debug log
            
            setAnalysis(result);
            if (result.mappedData) {
                console.log('Mapped Data:', result.mappedData); // Debug log
                // Ensure mappedData is an object with column keys
                if (typeof result.mappedData === 'object' && !Array.isArray(result.mappedData)) {
                    setMappedData(result.mappedData);
                } else {
                    console.error('Invalid mapped data format:', result.mappedData);
                    throw new Error('Invalid mapped data format received');
                }
            } else {
                console.error('Missing mapped data in result:', result);
                throw new Error('No mapped data received from analysis');
            }
        } catch (err) {
            setError(err.message);
            console.error('Error analyzing content:', err);
            if (err.response) {
                console.error('Error response:', await err.response.text());
            }
            setMappedData(null); // Clear any previous mapped data
        } finally {
            setLoading(false);
        }
    };

    const handleDataInsertion = async (data) => {
        try {
            // Clean numeric values
            const numericFields = ['prima_neta', 'derecho_de_p__liza', 'i_v_a__16_', 
                'recargo_por_pago_fraccionado', 'importe_total_a_pagar', 'monto_parcial'];
            
            const cleanData = { ...data };
            
            // Clean numeric values
            Object.entries(cleanData).forEach(([key, value]) => {
                if (numericFields.includes(key) && value !== null && value !== '') {
                    // Remove currency symbols and commas
                    const numStr = value.toString().replace(/[$,]/g, '');
                    const numValue = parseFloat(numStr) || 0;
                    cleanData[key] = numValue;
                }
            });

            console.log('Selected table:', selectedTable);
            console.log('Cleaned data for insertion:', cleanData);

            // Insert the data
            const result = await tableService.insertData(selectedTable, cleanData);
            console.log('Data insertion result:', result);
            
            setMessage('Data inserted successfully');
            setError(null);
        } catch (err) {
            console.error('Error inserting data:', err);
            setError(err.message || 'Failed to insert data');
            setMessage(null);
        }
    };

    return (
        <div className="gpt-analysis">
            <h3>GPT Analysis</h3>
            
            <div className="table-selection">
                <select 
                    value={selectedTable}
                    onChange={(e) => handleTableSelect(e.target.value)}
                    className="table-select"
                >
                    <option value="">Select Target Table</option>
                    {dbTables.map(table => (
                        <option key={table.name} value={table.name}>
                            {table.name}
                        </option>
                    ))}
                </select>

                {selectedTable && (
                    <>
                        <div className="column-info">
                            <h4>Table Structure:</h4>
                            <div className="table-preview">
                                <table>
                                    <thead>
                                        <tr>
                                            {dbTables
                                                .find(t => t.name === selectedTable)
                                                ?.columns.map(col => (
                                                    <th key={col.name}>
                                                        {col.name}
                                                        <br/>
                                                        <span className="column-type">({col.type})</span>
                                                    </th>
                                                ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            {dbTables
                                                .find(t => t.name === selectedTable)
                                                ?.columns.map(col => (
                                                    <td key={col.name} className="empty-cell">
                                                        {col.name === 'id' || col.name === 'pdf' ? 
                                                            'null' : 
                                                            '[To be filled by GPT]'}
                                                    </td>
                                                ))}
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <button 
                            onClick={analyzeContent}
                            disabled={loading || !parsedData || !selectedTable}
                            className="analyze-button"
                        >
                            {loading ? 'Analyzing...' : 'Extract Data'}
                        </button>
                    </>
                )}
            </div>

            {error && (
                <div className="error-message">
                    Error: {error}
                </div>
            )}

            {mappedData && (
                <div className="mapped-data-section">
                    <h4>Extracted Data:</h4>
                    <div className="table-preview">
                        <table>
                            <thead>
                                <tr>
                                    {Object.keys(mappedData).map(column => (
                                        <th key={column}>
                                            {column}
                                            <br/>
                                            <span className="column-type">
                                                ({dbTables
                                                    .find(t => t.name === selectedTable)
                                                    ?.columns.find(c => c.name === column)?.type || 'unknown'})
                                            </span>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    {Object.values(mappedData).map((value, index) => (
                                        <td key={index} className={value === null ? 'null-value' : ''}>
                                            {value !== null ? String(value) : 'null'}
                                        </td>
                                    ))}
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <div className="button-container">
                        <button 
                            onClick={() => handleDataInsertion(mappedData)}
                            className="insert-button"
                            disabled={!mappedData}
                        >
                            Add to {selectedTable} Table
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GPTAnalysis; 