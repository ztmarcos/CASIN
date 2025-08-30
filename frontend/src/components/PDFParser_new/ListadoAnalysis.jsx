import React, { useState, useEffect } from 'react';
import tableService from '../../services/data/tableService';
import { API_URL } from '../../config/api.js';
import { notifyDataInsert } from '../../utils/dataUpdateNotifier';
import './ListadoAnalysis.css';

const ListadoAnalysis = ({ parsedData, selectedTable, tableInfo, autoAnalyze = false, onClose }) => {
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
            setError('Por favor selecciona una tabla válida primero');
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
                    Por favor analiza el documento y extrae la siguiente información para cada elemento en la lista:
                    ${columns.map(col => `- ${col}: Encuentra el valor exacto en el texto`).join('\n')}
                    
                    Reglas importantes:
                    1. Extrae valores EXACTOS del documento
                    2. No repitas valores en diferentes campos
                    3. Devuelve null si no se puede encontrar un valor
                    4. Para fechas, mantén el formato como se muestra en el documento
                    5. Para valores monetarios, incluye la cantidad completa con decimales
                    6. Para campos de texto, extrae el texto completo como se muestra
                    7. Esta es una tabla de lista, extrae todos los elementos encontrados en el documento
                    
                    REGLAS DE NORMALIZACIÓN DE TEXTO:
                    8. NOMBRES DE ASEGURADORA: Siempre normaliza "Grupo Nacional Provincial, S.A.B.", "Grupo Nacional Provincial S.A.B.", "Grupo Nación Aprovincial", "Grupo Nacional Aprovincial", "GNP Seguros", "G.N.P.", o cualquier variación a "GNP"
                    8.1. También normaliza "Qualitas SA de CV", "Qualitas S.A. de C.V.", "Qualitas Seguros", o cualquier variación a "Qualitas"
                    9. NOMBRES DE PERSONAS: Convierte a formato Título Apropiado (ej., "JUAN PÉREZ LÓPEZ" → "Juan Pérez López", mantén "de", "del", "la" en minúsculas)
                    10. DIRECCIONES: Estandariza abreviaciones (Av. → Avenida, Col. → Colonia, No. → Número, etc.) y usa formato Título
                    11. CAMPOS RFC: Mantén el RFC exactamente como se encuentra, solo en mayúsculas y sin espacios extra
                    12. TEXTO GENERAL: Limpia espacios extra, normaliza comillas y apostrofes
                `
            };

            const response = await fetch(`${API_URL}/gpt/analyze-list`, {
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
            
            setMessage('Datos insertados exitosamente');
            setError(null);

            // Emit a custom event to notify other components and close modal
            const event = new CustomEvent('policyDataUpdated', {
                detail: { table: selectedTable, shouldCloseModal: true }
            });
            window.dispatchEvent(event);
            
            // Also trigger the new notification system
            notifyDataInsert(selectedTable);
            
            // Close the modal after successful insertion
            if (onClose) {
                setTimeout(() => {
                    onClose();
                }, 1500); // Give time to show success message
            }

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
            <div className="listado-analysis-header">
                <h3>Análisis de Listado</h3>
                <div className="header-actions">
                    {mappedData.length > 0 && (
                        <button 
                            onClick={() => handleDataInsertion(editedData)}
                            className="insert-button primary"
                        >
                            Agregar Datos
                        </button>
                    )}
                    {onClose && (
                        <button 
                            onClick={onClose}
                            className="close-button"
                        >
                            ✕
                        </button>
                    )}
                </div>
            </div>

            {!selectedTable && (
                <div className="error-message">Por favor selecciona una tabla primero</div>
            )}

            {!parsedData && (
                <div className="error-message">Por favor sube un archivo PDF primero</div>
            )}

            {loading && (
                <div className="loading">Analizando contenido...</div>
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
                    <h4>Datos Extraídos</h4>
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
                            onClick={analyzeContent}
                            className="reanalyze-button"
                        >
                            Reanalizar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ListadoAnalysis; 