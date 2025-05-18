import React, { useState, useEffect } from 'react';
import tableService from '../../services/data/tableService';
import './GPTAnalysis.css';

const GPTAnalysis = ({ parsedData, selectedTable, tableInfo, autoAnalyze = false }) => {
    const [analysis, setAnalysis] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [mappedData, setMappedData] = useState(null);
    const [editedData, setEditedData] = useState(null);
    const [message, setMessage] = useState(null);
    const [editingCell, setEditingCell] = useState(null);
    
    // Move tableName to component scope so it's available everywhere
    const tableName = typeof selectedTable === 'string' ? selectedTable : selectedTable?.name;

    useEffect(() => {
        if (mappedData && !editedData) {
            setEditedData({...mappedData});
        }
    }, [mappedData]);

    // Trigger analysis automatically when data is available and autoAnalyze is true
    useEffect(() => {
        if (autoAnalyze && parsedData && tableName && !analysis) {
            analyzeContent();
        }
    }, [parsedData, tableName, autoAnalyze]);

    const analyzeContent = async () => {
        if (!tableName || !tableInfo) {
            setError('Please select a valid target table first');
            return;
        }

        setLoading(true);
        setError(null);
        
        try {
            console.log('Fetching tables for:', tableName);
            const tables = await tableService.getTables();
            console.log('Available tables:', tables.map(t => t.name));
            
            const targetTable = tables.find(t => t.name === tableName);
            if (!targetTable) {
                console.error('Table not found:', tableName, 'Available tables:', tables.map(t => t.name));
                throw new Error(`Selected table "${tableName}" not found`);
            }

            // Get columns based on table type
            let columns;
            if (tableInfo.type === 'simple') {
                columns = tableInfo.fields;
            } else if (tableInfo.type === 'group') {
                columns = tableInfo.childFields;
            } else {
                // If no specific type, use all columns from the table except 'id'
                columns = targetTable.columns
                    .filter(col => col.name !== 'id')
                    .map(col => col.name);
            }

            // Create prompt for GPT
            const prompt = {
                text: parsedData.text,
                tables: [targetTable], // Only send the target table
                metadata: parsedData.metadata,
                targetColumns: columns,
                tableName: tableName,
                tableType: tableInfo.type || 'simple',
                instructions: `
                    Please analyze the document and extract the following information:
                    ${columns.map(col => `- ${col}: Find the exact value in the text`).join('\n')}
                    
                    Important rules:
                    1. Extract EXACT values from the document
                    2. Do not repeat values across different fields
                    3. Return null if a value cannot be found
                    4. For dates, maintain the format as shown in the document
                    5. For currency values, include the full amount with decimals
                    6. For text fields, extract the complete text as shown
                    ${tableInfo.type === 'simple' ? '7. This is a simple policy table, focus on basic policy information' : ''}
                `
            };

            const response = await fetch('http://localhost:3001/api/gpt/analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(prompt),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to analyze content');
            }

            const result = await response.json();
            
            if (result.mappedData) {
                // Clean the data before setting it
                const cleanData = {};
                
                // Only include fields that are in our columns list
                columns.forEach(column => {
                    cleanData[column] = result.mappedData[column] || null;
                });

                setAnalysis(result);
                setMappedData(cleanData);
            } else {
                throw new Error('No mapped data received from analysis');
            }
        } catch (err) {
            console.error('Error analyzing content:', err);
            setError(err.message || 'Failed to analyze content');
        } finally {
            setLoading(false);
        }
    };

    const handleDataInsertion = async (data) => {
        try {
            if (!tableName || !tableInfo) {
                throw new Error('Invalid table information');
            }

            // Create a copy of the data and remove the id field
            const cleanData = { ...data };
            delete cleanData.id;  // Remove id field as it's auto-incremented

            // Define field types based on table type
            const fieldTypes = {
                numeric: ['prima', 'suma_asegurada', 'prima_neta', 'derecho_de_poliza', 'i_v_a', 'recargo_por_pago_fraccionado', 'pago_total_o_prima_total', 'modelo'],
                date: ['fecha_inicio', 'fecha_fin', 'desde_vigencia', 'hasta_vigencia', 'fecha_expedicion', 'fecha_pago'],
                status: ['status']
            };

            // Clean and format data based on field types
            Object.entries(cleanData).forEach(([key, value]) => {
                if (value === null || value === undefined || value === '') {
                    cleanData[key] = null;
                    return;
                }

                if (fieldTypes.numeric.includes(key)) {
                    // Remove currency symbols and commas
                    const numStr = value.toString().replace(/[$,]/g, '');
                    cleanData[key] = parseFloat(numStr) || null;
                } else if (fieldTypes.date.includes(key)) {
                    // Format date to YYYY-MM-DD
                    try {
                        if (typeof value === 'string') {
                            if (value.includes('/')) {
                                const [day, month, year] = value.split('/');
                                cleanData[key] = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                            } else if (value.includes('-')) {
                                cleanData[key] = value;
                            }
                        } else if (value instanceof Date) {
                            cleanData[key] = value.toISOString().split('T')[0];
                        }
                    } catch (e) {
                        console.warn(`Failed to parse date: ${value}`, e);
                        cleanData[key] = null;
                    }
                } else if (fieldTypes.status.includes(key)) {
                    // Normalize status values
                    const status = value.toString().toLowerCase();
                    cleanData[key] = status === 'pagado' || status === 'paid' ? 'Pagado' : 'No Pagado';
                }
            });

            // Insert the data
            const result = await tableService.insertData(tableName, cleanData);
            console.log('Data insertion result:', result);
            
            setMessage('Data inserted successfully');
            setError(null);

            // Emit a custom event to notify other components
            const event = new CustomEvent('policyDataUpdated', {
                detail: { table: tableName }
            });
            window.dispatchEvent(event);

        } catch (err) {
            console.error('Error inserting data:', err);
            setError(err.message || 'Failed to insert data');
            setMessage(null);
        }
    };

    const handleCellEdit = (column, value) => {
        setEditedData(prev => ({
            ...prev,
            [column]: value
        }));
    };

    const handleKeyDown = (e, column) => {
        if (e.key === 'Enter') {
            setEditingCell(null);
        }
    };

    return (
        <div className="gpt-analysis">
            {!selectedTable && (
                <div className="error-message">Please select a table first</div>
            )}

            {!parsedData && (
                <div className="error-message">Please upload a PDF file first</div>
            )}

            {loading && (
                <div className="loading">Analyzing content...</div>
            )}

            {error && (
                <div className="error-message">
                    {error}
                    <button onClick={analyzeContent} className="retry-button">
                        Retry Analysis
                    </button>
                </div>
            )}

            {message && (
                <div className="success-message">{message}</div>
            )}

            {mappedData && (
                <div className="mapped-data">
                    <h3>Extracted Data</h3>
                    <div className="data-table">
                        <table>
                            <thead>
                                <tr>
                                    <th>Field</th>
                                    <th>Value</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Object.entries(editedData || {}).map(([key, value]) => (
                                    <tr key={key}>
                                        <td>{key}</td>
                                        <td>
                                            {editingCell === key ? (
                                                <input
                                                    type="text"
                                                    value={value || ''}
                                                    onChange={(e) => handleCellEdit(key, e.target.value)}
                                                    onBlur={() => setEditingCell(null)}
                                                    onKeyDown={(e) => handleKeyDown(e, key)}
                                                    autoFocus
                                                />
                                            ) : (
                                                <span onClick={() => setEditingCell(key)}>
                                                    {value || 'N/A'}
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="action-buttons">
                        <button 
                            onClick={() => handleDataInsertion(editedData)}
                            className="insert-button"
                        >
                            Insert Data
                        </button>
                        <button 
                            onClick={analyzeContent}
                            className="reanalyze-button"
                        >
                            Reanalyze
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GPTAnalysis; 