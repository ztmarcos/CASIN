import React, { useState, useEffect } from 'react';
import tableService from '../../services/data/tableService';
import './GPTAnalysis.css';

const GPTAnalysis = ({ parsedData, tables, selectedTable, autoAnalyze = false }) => {
    const [analysis, setAnalysis] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [mappedData, setMappedData] = useState(null);
    const [editedData, setEditedData] = useState(null);
    const [message, setMessage] = useState(null);
    const [editingCell, setEditingCell] = useState(null);

    useEffect(() => {
        if (mappedData && !editedData) {
            setEditedData({...mappedData});
        }
    }, [mappedData]);

    // Trigger analysis automatically when data is available and autoAnalyze is true
    useEffect(() => {
        if (autoAnalyze && parsedData && selectedTable && !analysis) {
            analyzeContent();
        }
    }, [parsedData, selectedTable, autoAnalyze]);

    const analyzeContent = async () => {
        if (!selectedTable) {
            setError('Please select a target table first');
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

            // Get all columns except 'id'
            const columns = targetTable.columns
                .filter(col => col.name !== 'id')
                .map(col => col.name);

            // Create prompt for GPT
            const prompt = {
                text: parsedData.text,
                tables: tables,
                metadata: parsedData.metadata,
                targetColumns: columns,
                tableName: selectedTable,
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
            setError(err.message);
            console.error('Error analyzing content:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDataInsertion = async (data) => {
        try {
            // Create a copy of the data and remove the id field
            const cleanData = { ...data };
            delete cleanData.id;  // Remove id field as it's auto-incremented
            
            // Clean numeric values
            const numericFields = [
                'prima_neta', 
                'derecho_de_poliza', 
                'i_v_a', 
                'recargo_por_pago_fraccionado', 
                'pago_total_o_prima_total',
                'modelo'  // Year field
            ];
            
            // Clean numeric values and prepare data for insertion
            Object.entries(cleanData).forEach(([key, value]) => {
                if (numericFields.includes(key) && value !== null && value !== '') {
                    // Remove currency symbols and commas
                    const numStr = value.toString().replace(/[$,]/g, '');
                    cleanData[key] = parseFloat(numStr) || 0;
                }
            });

            // Ensure tipo_de_vehiculo is one of the allowed values
            if (cleanData.tipo_de_vehiculo) {
                const tipo = cleanData.tipo_de_vehiculo.toUpperCase();
                if (!['AUTO', 'MOTO', 'CAMION', 'TAXI'].includes(tipo)) {
                    cleanData.tipo_de_vehiculo = 'AUTO';
                } else {
                    cleanData.tipo_de_vehiculo = tipo;
                }
            }

            console.log('Selected table:', selectedTable);
            console.log('Cleaned data for insertion:', cleanData);

            // Insert the data as a single object, not wrapped in an array
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
            {loading && <div className="loading">Analyzing content...</div>}
            
            {error && (
                <div className="error-message">
                    Error: {error}
                </div>
            )}

            {mappedData && editedData && (
                <div className="analysis-results">
                    <h3>Extracted Data Preview</h3>
                    <div className="table-preview">
                        <table>
                            <thead>
                                <tr>
                                    {Object.keys(mappedData).map(column => (
                                        <th key={column}>{column}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    {Object.keys(editedData).map((column) => (
                                        <td 
                                            key={column} 
                                            className={`
                                                ${editedData[column] === null ? 'null-value' : ''}
                                                ${editingCell === column ? 'editing' : ''}
                                            `}
                                            onClick={() => setEditingCell(column)}
                                        >
                                            {editingCell === column ? (
                                                <input
                                                    type="text"
                                                    value={editedData[column] !== null ? String(editedData[column]) : ''}
                                                    onChange={(e) => handleCellEdit(column, e.target.value)}
                                                    onKeyDown={(e) => handleKeyDown(e, column)}
                                                    onBlur={() => setEditingCell(null)}
                                                    autoFocus
                                                />
                                            ) : (
                                                editedData[column] !== null ? String(editedData[column]) : '-'
                                            )}
                                        </td>
                                    ))}
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    
                    <button 
                        onClick={() => handleDataInsertion(editedData)}
                        className="insert-button"
                    >
                        Insert into Database
                    </button>
                </div>
            )}

            {message && (
                <div className="message">
                    {message}
                </div>
            )}
        </div>
    );
};

export default GPTAnalysis; 