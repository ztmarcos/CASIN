import React, { useState, useEffect } from 'react';
import tableService from '../../services/data/tableService';
import './ListadoAnalysis.css';

const ListadoAnalysis = ({ parsedData, selectedTable, tableInfo, autoAnalyze = false }) => {
    const [analysis, setAnalysis] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [mappedData, setMappedData] = useState([]);
    const [editedData, setEditedData] = useState([]);
    const [message, setMessage] = useState(null);
    const [editingCell, setEditingCell] = useState(null);

    useEffect(() => {
        if (mappedData.length > 0 && editedData.length === 0) {
            setEditedData([...mappedData]);
        }
    }, [mappedData]);

    // Trigger analysis automatically when data is available and autoAnalyze is true
    useEffect(() => {
        if (autoAnalyze && parsedData && selectedTable && !analysis) {
            analyzeContent();
        }
    }, [parsedData, selectedTable, autoAnalyze]);

    const analyzeContent = async () => {
        if (!selectedTable || !tableInfo) {
            setError('Please select a valid target table first');
            return;
        }

        setLoading(true);
        setError(null);
        
        try {
            const tables = await tableService.getTables();
            const targetTable = tables.find(t => t.name === selectedTable);
            if (!targetTable) {
                throw new Error('Selected table not found');
            }

            // Get columns based on table type
            let columns;
            if (tableInfo.type === 'listado') {
                columns = tableInfo.fields;
            } else {
                columns = targetTable.columns
                    .filter(col => col.name !== 'id')
                    .map(col => col.name);
            }

            // Create prompt for GPT
            const prompt = {
                text: parsedData.text,
                tables: tables,
                metadata: parsedData.metadata,
                targetColumns: columns,
                tableName: selectedTable,
                tableType: tableInfo.type,
                instructions: `
                    Please analyze the document and extract the following information for each item in the list:
                    ${columns.map(col => `- ${col}: Find the exact value in the text`).join('\n')}
                    
                    Important rules:
                    1. Extract EXACT values from the document
                    2. Do not repeat values across different fields
                    3. Return null if a value cannot be found
                    4. For dates, maintain the format as shown in the document
                    5. For currency values, include the full amount with decimals
                    6. For text fields, extract the complete text as shown
                    7. This is a list table, extract all items found in the document
                `
            };

            const response = await fetch('http://localhost:3001/api/gpt/analyze-list', {
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
            
            if (result.mappedData && Array.isArray(result.mappedData)) {
                // Clean the data before setting it
                const cleanData = result.mappedData.map(item => {
                    const cleanItem = {};
                    columns.forEach(column => {
                        cleanItem[column] = item[column] || null;
                    });
                    return cleanItem;
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
            if (!tableInfo) {
                throw new Error('Invalid table information');
            }

            // Clean and format each item in the data array
            const cleanedData = data.map(item => {
                const cleanItem = { ...item };
                delete cleanItem.id;  // Remove id field as it's auto-incremented

                // Define field types based on table type
                const fieldTypes = {
                    numeric: ['prima', 'suma_asegurada', 'prima_neta', 'derecho_de_poliza', 'i_v_a', 'recargo_por_pago_fraccionado', 'pago_total_o_prima_total', 'modelo'],
                    date: ['fecha_inicio', 'fecha_fin', 'desde_vigencia', 'hasta_vigencia', 'fecha_expedicion', 'fecha_pago'],
                    status: ['status']
                };

                // Clean and format data based on field types
                for (const [key, value] of Object.entries(cleanItem)) {
                    if (fieldTypes.numeric.includes(key)) {
                        const numStr = value?.toString().replace(/[$,]/g, '') || '0';
                        cleanItem[key] = parseFloat(numStr) || null;
                    } else if (fieldTypes.date.includes(key)) {
                        try {
                            if (typeof value === 'string') {
                                if (value.includes('/')) {
                                    // Convert DD/MM/YYYY to YYYY-MM-DD
                                    const [day, month, year] = value.split('/');
                                    cleanItem[key] = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                                } else if (value.includes('-')) {
                                    // If already in YYYY-MM-DD format, keep it
                                    cleanItem[key] = value;
                                }
                            } else if (value instanceof Date) {
                                cleanItem[key] = value.toISOString().split('T')[0];
                            }
                        } catch (e) {
                            console.warn(`Failed to parse date: ${value}`, e);
                            cleanItem[key] = null;
                        }
                    } else if (fieldTypes.status.includes(key)) {
                        const status = value?.toString().toLowerCase();
                        cleanItem[key] = status === 'pagado' || status === 'paid' ? 'Pagado' : 'No Pagado';
                    }
                }

                return cleanItem;
            });

            // Insert the data
            const result = await tableService.insertData(selectedTable, cleanedData);
            console.log('Data insertion result:', result);
            
            setMessage('Data inserted successfully');
            setError(null);

            // Emit a custom event to notify other components
            const event = new CustomEvent('policyDataUpdated', {
                detail: { table: selectedTable }
            });
            window.dispatchEvent(event);

        } catch (err) {
            console.error('Error inserting data:', err);
            setError(err.message || 'Failed to insert data');
            setMessage(null);
        }
    };

    const handleCellEdit = (index, column, value) => {
        setEditedData(prev => {
            const newData = [...prev];
            newData[index] = {
                ...newData[index],
                [column]: value
            };
            return newData;
        });
    };

    const handleKeyDown = (e, index, column) => {
        if (e.key === 'Enter') {
            setEditingCell(null);
        }
    };

    return (
        <div className="listado-analysis">
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

            {mappedData.length > 0 && (
                <div className="mapped-data">
                    <h3>Extracted Data</h3>
                    <div className="data-table">
                        <table>
                            <thead>
                                <tr>
                                    <th>#</th>
                                    {Object.keys(mappedData[0]).map(column => (
                                        <th key={column}>{column}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {editedData.map((item, index) => (
                                    <tr key={index}>
                                        <td>{index + 1}</td>
                                        {Object.entries(item).map(([key, value]) => (
                                            <td key={key}>
                                                {editingCell === `${index}-${key}` ? (
                                                    <input
                                                        type="text"
                                                        value={value || ''}
                                                        onChange={(e) => handleCellEdit(index, key, e.target.value)}
                                                        onBlur={() => setEditingCell(null)}
                                                        onKeyDown={(e) => handleKeyDown(e, index, key)}
                                                        autoFocus
                                                    />
                                                ) : (
                                                    <span onClick={() => setEditingCell(`${index}-${key}`)}>
                                                        {value || 'N/A'}
                                                    </span>
                                                )}
                                            </td>
                                        ))}
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

export default ListadoAnalysis; 