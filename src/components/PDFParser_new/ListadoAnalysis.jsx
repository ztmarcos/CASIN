import React, { useState, useEffect } from 'react';
import tableService from '../../services/data/tableService';
import './GPTAnalysis.css';

const ListadoAnalysis = ({ parsedData, tables, selectedTable, autoAnalyze = false }) => {
    const [analysis, setAnalysis] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [mappedData, setMappedData] = useState(null);
    const [editedData, setEditedData] = useState(null);
    const [message, setMessage] = useState(null);
    const [editingCell, setEditingCell] = useState(null);
    const [tableColumns, setTableColumns] = useState([]);

    useEffect(() => {
        if (mappedData && !editedData) {
            setEditedData([...mappedData]);
        }
    }, [mappedData]);

    useEffect(() => {
        if (autoAnalyze && parsedData && selectedTable && !analysis) {
            analyzeContent();
        }
    }, [parsedData, selectedTable, autoAnalyze]);

    useEffect(() => {
        const loadColumns = async () => {
            try {
                const tables = await tableService.getTables();
                const targetTable = tables.find(t => t.name === 'listado');
                if (targetTable) {
                    const columns = targetTable.columns
                        .filter(col => col.name !== 'id')
                        .map(col => col.name);
                    setTableColumns(columns);
                }
            } catch (err) {
                console.error('Error loading columns:', err);
            }
        };
        loadColumns();
    }, []);

    const analyzeContent = async () => {
        if (!selectedTable || selectedTable !== 'listado') {
            setError('Este componente es solo para la tabla listado');
            return;
        }

        setLoading(true);
        setError(null);
        
        try {
            const tables = await tableService.getTables();
            const targetTable = tables.find(t => t.name === 'listado');
            if (!targetTable) {
                throw new Error('Tabla listado no encontrada');
            }

            // Get all columns except 'id'
            const columns = targetTable.columns
                .filter(col => col.name !== 'id')
                .map(col => col.name);

            // Split the text into sections (one per person)
            const sections = parsedData.text.split(/(?=\d{7}[A-Z])/);
            console.log(`Total de secciones a procesar: ${sections.length}`);
            
            const batchResults = [];
            const ANALYSIS_BATCH_SIZE = 10; // Procesar 10 secciones por lote

            for (let i = 0; i < sections.length; i += ANALYSIS_BATCH_SIZE) {
                const batchSections = sections.slice(i, i + ANALYSIS_BATCH_SIZE);
                console.log(`Procesando lote ${Math.floor(i/ANALYSIS_BATCH_SIZE) + 1} de ${Math.ceil(sections.length/ANALYSIS_BATCH_SIZE)}`);
                
                const batchPrompt = {
                    text: batchSections.join('\n'),
                    tables: [targetTable], // Solo enviamos la tabla listado
                    metadata: parsedData.metadata,
                    targetColumns: columns,
                    tableName: 'listado',
                    instructions: `
                        Analiza cada sección y extrae la siguiente información para cada persona:
                        ${columns.map(col => `- ${col}: Encuentra el valor exacto en el texto`).join('\n')}
                        
                        Reglas importantes:
                        1. Cada sección representa una persona
                        2. Extrae los valores EXACTOS del documento
                        3. Retorna null si no encuentras un valor
                        4. Para fechas, mantén el formato como se muestra
                        5. Retorna un array de objetos, uno por cada persona encontrada
                        6. El status debe ser 'Vigente 🟢' por defecto
                        7. Solo busca en la tabla de listado y evita lo demás.
                    `
                };

                const response = await fetch('http://localhost:3001/api/gpt/analyze', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(batchPrompt),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Error al analizar el contenido');
                }

                const result = await response.json();
                if (result.mappedData) {
                    const data = Array.isArray(result.mappedData) ? result.mappedData : [result.mappedData];
                    batchResults.push(...data);
                }

                // Actualizar el estado para mostrar el progreso
                setMessage(`Analizando: ${Math.min(((i + ANALYSIS_BATCH_SIZE) / sections.length) * 100, 100).toFixed(0)}%`);
            }

            setAnalysis({ mappedData: batchResults });
            setMappedData(batchResults);
            setMessage(`Análisis completado: ${batchResults.length} registros encontrados`);
        } catch (err) {
            setError(err.message);
            console.error('Error analyzing content:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDataInsertion = async () => {
        try {
            if (!editedData || editedData.length === 0) {
                throw new Error('No hay datos para insertar');
            }

            if (tableColumns.length === 0) {
                throw new Error('No se han cargado las columnas de la tabla');
            }

            // Asegurar que tenemos un array de registros y eliminar índices numéricos
            const recordsToInsert = (Array.isArray(editedData) ? editedData : [editedData])
                .map(item => {
                    // Crear un nuevo objeto solo con las propiedades válidas
                    const validItem = {};
                    Object.entries(item).forEach(([key, value]) => {
                        // Solo incluir propiedades que no sean índices numéricos
                        if (isNaN(key)) {
                            validItem[key] = value;
                        }
                    });
                    return validItem;
                });

            // Limpieza y validación de datos
            const cleanedRecords = recordsToInsert.reduce((acc, item) => {
                // Si el item tiene polizas, procesar cada una
                if (item.polizas && Array.isArray(item.polizas)) {
                    const cleanedPolizas = item.polizas.map(poliza => {
                        const cleaned = {};
                        // Solo incluir los campos de listado
                        tableColumns.forEach(field => {
                            if (poliza[field] !== undefined) {
                                cleaned[field] = poliza[field];
                            }
                        });
                        cleaned.status = cleaned.status || 'Vigente 🟢';
                        return cleaned;
                    });
                    return [...acc, ...cleanedPolizas];
                }

                // Si es un registro individual
                const cleaned = {};
                tableColumns.forEach(field => {
                    if (item[field] !== undefined) {
                        cleaned[field] = item[field];
                    }
                });
                cleaned.status = cleaned.status || 'Vigente 🟢';
                return [...acc, cleaned];
            }, []);

            console.log('Registros limpios a insertar:', cleanedRecords);

            // Inserción por lotes
            const BATCH_SIZE = 3;
            let successCount = 0;

            for (let i = 0; i < cleanedRecords.length; i += BATCH_SIZE) {
                const batch = cleanedRecords.slice(i, i + BATCH_SIZE);
                try {
                    // Asegurar que batch es un array y solo contiene campos válidos
                    const batchToSend = batch.map(record => {
                        const validRecord = {};
                        // Solo incluir campos que existen en la tabla
                        tableColumns.forEach(field => {
                            if (record[field] !== undefined) {
                                validRecord[field] = record[field];
                            }
                        });
                        return validRecord;
                    });

                    console.log('Insertando lote:', batchToSend);
                    
                    await tableService.insertData('listado', batchToSend);
                    successCount += batchToSend.length;
                    setMessage(`Procesando: ${Math.floor((i + BATCH_SIZE) / cleanedRecords.length * 100)}% completado...`);
                } catch (error) {
                    console.error('Error en lote:', error);
                    throw new Error(`Error al insertar lote: ${error.message}`);
                }
            }

            setMessage(`${successCount} registros insertados exitosamente`);
            setError(null);
        } catch (err) {
            console.error('Error inserting data:', err);
            setError(err.message || 'Error al insertar datos');
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

    return (
        <div className="gpt-analysis">
            {loading && <div className="loading">Analizando contenido...</div>}
            
            {error && (
                <div className="error-message">
                    Error: {error}
                </div>
            )}

            {mappedData && editedData && (
                <div className="analysis-results">
                    <h3>Vista previa de datos extraídos ({editedData.length} registros)</h3>
                    <div className="table-preview">
                        <table>
                            <thead>
                                <tr>
                                    {tableColumns.map(column => (
                                        <th key={column}>{column}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {editedData.map((row, rowIndex) => (
                                    <tr key={rowIndex}>
                                        {tableColumns.map((column) => (
                                            <td 
                                                key={`${rowIndex}-${column}`}
                                                className={`
                                                    ${row[column] === null ? 'null-value' : ''}
                                                    ${editingCell === `${rowIndex}-${column}` ? 'editing' : ''}
                                                `}
                                                onClick={() => setEditingCell(`${rowIndex}-${column}`)}
                                            >
                                                {editingCell === `${rowIndex}-${column}` ? (
                                                    <input
                                                        type="text"
                                                        value={row[column] !== null ? String(row[column]) : ''}
                                                        onChange={(e) => handleCellEdit(rowIndex, column, e.target.value)}
                                                        onBlur={() => setEditingCell(null)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') setEditingCell(null);
                                                        }}
                                                        autoFocus
                                                    />
                                                ) : (
                                                    row[column] !== null ? String(row[column]) : '-'
                                                )}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    
                    <button 
                        onClick={handleDataInsertion}
                        className="insert-button"
                    >
                        Insertar {editedData.length} registros en la base de datos
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

export default ListadoAnalysis; 