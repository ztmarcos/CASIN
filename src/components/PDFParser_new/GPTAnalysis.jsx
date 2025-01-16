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
            const targetTable = dbTables.find(t => t.name === selectedTable);
            if (!targetTable) {
                throw new Error('Selected table not found');
            }

            const columns = targetTable.columns.map(col => col.name);
            console.log('Analyzing with columns:', columns);

            // Create a structured prompt for GPT with simpler column format
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
            console.log('GPT Analysis Result:', JSON.stringify(result, null, 2));
            
            if (result.mappedData) {
                // First pass: GPT's attempt at mapping
                const gptMappedData = result.mappedData;
                
                // Second pass: Validate and correct with regex
                const validatedData = validateMappedData(gptMappedData, columns);
                
                // Third pass: Compare and merge the best results
                const finalData = {};
                columns.forEach(column => {
                    // Try regex first, then GPT data
                    finalData[column] = validatedData[column] || gptMappedData[column] || null;
                });

                console.log('Final Mapped Data:', finalData);
                setAnalysis(result);
                setMappedData(finalData);
            } else {
                throw new Error('No mapped data received from analysis');
            }
        } catch (err) {
            setError(err.message);
            console.error('Error analyzing content:', err);
            if (err.response) {
                console.error('Error response:', await err.response.text());
            }
            setMappedData(null);
        } finally {
            setLoading(false);
        }
    };

    // Add validation function
    const validateMappedData = (data, columns) => {
        const validatedData = {};
        
        // Helper function to extract value using regex
        const extractValue = (pattern, text, group = 1) => {
            const match = text.match(pattern);
            return match ? match[group].trim() : null;
        };

        // Helper function to clean currency values
        const cleanCurrency = (value) => {
            if (!value) return null;
            return value.replace(/[$,]/g, '').trim();
        };

        columns.forEach(column => {
            let value = data[column];
            
            // Extract values based on patterns in the text
            try {
                switch(column) {
                    case 'numero_de_poliza':
                        value = extractValue(/No\. Póliza\s+(\d+)/, parsedData.text);
                        break;
                    case 'nombre_contratante':
                        value = extractValue(/Nombre.*?(\d+\s+)?([^R.F.C.]+)(?=R\.F\.C\.|$)/s, parsedData.text, 2);
                        break;
                    case 'rfc':
                        value = extractValue(/R\.F\.C\.\s+([A-Z0-9]+)/, parsedData.text);
                        break;
                    case 'tipo_de_vehiculo':
                        // Use GPT's value if it's one of the allowed types, otherwise deduce from description
                        if (value && ['AUTO', 'MOTO', 'CAMION', 'TAXI'].includes(value.toUpperCase())) {
                            value = value.toUpperCase();
                        } else {
                            const desc = data.descripcion_del_vehiculo?.toLowerCase() || '';
                            const uso = data.uso?.toLowerCase() || '';
                            if (desc.includes('moto') || desc.includes('motocicleta')) {
                                value = 'MOTO';
                            } else if (desc.includes('camion') || desc.includes('camión')) {
                                value = 'CAMION';
                            } else if (uso.includes('taxi') || desc.includes('taxi')) {
                                value = 'TAXI';
                            } else {
                                value = 'AUTO';
                            }
                        }
                        break;
                    case 'vigencia_inicio':
                        value = extractValue(/Desde las \d+ hrs del\s+(\d+\/\w+\/\d{4})/, parsedData.text);
                        break;
                    case 'vigencia_fin':
                        value = extractValue(/Hasta las \d+ hrs del\s+(\d+\/\w+\/\d{4})/, parsedData.text);
                        break;
                    case 'domicilio_o_direccion':
                        value = extractValue(/Dirección.*?(?:Referencia\s+)?([^SPA]+)(?=SPA|$)/s, parsedData.text);
                        break;
                    case 'duracion':
                        value = extractValue(/Duración:\s+(\d+\s+días)/, parsedData.text);
                        break;
                    case 'prima_neta':
                        value = cleanCurrency(extractValue(/Prima Neta\s+\$([0-9,.]+)/, parsedData.text));
                        break;
                    case 'recargo_por_pago_fraccionado':
                        value = cleanCurrency(extractValue(/Recargo por Pago Fraccionado\s+\$([0-9,.]+)/, parsedData.text));
                        break;
                    case 'i_v_a':
                        value = cleanCurrency(extractValue(/I\.V\.A\.\s+\$([0-9,.]+)/, parsedData.text));
                        break;
                    case 'derecho_de_poliza':
                        value = cleanCurrency(extractValue(/Derecho de Póliza\s+\$([0-9,.]+)/, parsedData.text));
                        break;
                    case 'pago_total_o_prima_total':
                        value = cleanCurrency(extractValue(/Importe por Pagar\s+\$([0-9,.]+)/, parsedData.text));
                        break;
                    case 'forma_de_pago':
                        value = extractValue(/Forma de Pago\s+(\w+)/, parsedData.text);
                        break;
                    case 'serie':
                        value = extractValue(/Serie\s+([A-Z0-9]+)/, parsedData.text);
                        break;
                    case 'modelo':
                        value = extractValue(/Modelo\s+(\d{4})/, parsedData.text);
                        break;
                    case 'placas':
                        value = extractValue(/Placas\s+([A-Z0-9]+)/, parsedData.text);
                        break;
                    case 'motor':
                        value = extractValue(/Motor\s+([A-Z0-9]+)/, parsedData.text);
                        break;
                    case 'uso':
                        value = extractValue(/Uso\s+(\w+)/, parsedData.text);
                        break;
                    default:
                        // Keep the original value if no specific validation needed
                        value = data[column] || null;
                }
            } catch (err) {
                console.error(`Error extracting value for ${column}:`, err);
                value = null;
            }
            
            validatedData[column] = value;
        });
        
        console.log('Validated data:', validatedData);
        return validatedData;
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