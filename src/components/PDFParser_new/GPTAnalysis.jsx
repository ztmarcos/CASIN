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
    
    // Debug logs
    console.log('GPTAnalysis - selectedTable:', selectedTable);
    console.log('GPTAnalysis - tableName derived:', tableName);
    console.log('GPTAnalysis - typeof selectedTable:', typeof selectedTable);
    console.log('GPTAnalysis - tableInfo:', tableInfo);

    // Define field types at component level
    const fieldTypes = {
        numeric: ['prima', 'suma_asegurada', 'prima_neta', 'derecho_de_poliza', 'i_v_a', 'recargo_por_pago_fraccionado', 'pago_total_o_prima_total', 'modelo'],
        date: ['fecha_inicio', 'fecha_fin', 'desde_vigencia', 'hasta_vigencia', 'fecha_expedicion', 'fecha_pago'],
        status: ['status']
    };

    // Comprehensive text normalization function
    const normalizeText = (text, fieldType = 'general') => {
        if (!text || typeof text !== 'string') return text;
        
        // Don't normalize RFC fields
        if (fieldType === 'rfc') return text.toUpperCase().trim();
        
        let normalized = text;
        
        // Basic cleanup
        normalized = normalized.trim();
        
        // Company name normalization - GNP variations
        const gnpVariations = [
            /grupo\s+nacional\s+provincial\s*,?\s*s\.a\.b\.?/gi,
            /grupo\s+naci[oó]n\s+aprovincial/gi,
            /grupo\s+nacional\s+aprovincial/gi,
            /gnp\s+seguros/gi,
            /g\.n\.p\.?/gi,
            /grupo\s+nacion\s+aprovincial/gi
        ];
        
        gnpVariations.forEach(pattern => {
            normalized = normalized.replace(pattern, 'GNP');
        });
        
        // Name normalization (for person names)
        if (fieldType === 'name' || fieldType === 'contratante') {
            // Convert to title case
            normalized = normalized.toLowerCase()
                .split(' ')
                .map(word => {
                    // Handle common prefixes and suffixes
                    if (['de', 'del', 'la', 'las', 'los', 'el', 'y', 'e'].includes(word)) {
                        return word;
                    }
                    return word.charAt(0).toUpperCase() + word.slice(1);
                })
                .join(' ');
            
            // Fix common name patterns
            normalized = normalized.replace(/\bDe\b/g, 'de');
            normalized = normalized.replace(/\bDel\b/g, 'del');
            normalized = normalized.replace(/\bLa\b/g, 'la');
            normalized = normalized.replace(/\bY\b/g, 'y');
        }
        
        // Address normalization
        if (fieldType === 'address' || fieldType === 'direccion') {
            // Standardize common address abbreviations
            const addressReplacements = {
                'av\\.?': 'Avenida',
                'ave\\.?': 'Avenida',
                'blvd\\.?': 'Boulevard',
                'c\\.?': 'Calle',
                'col\\.?': 'Colonia',
                'fracc\\.?': 'Fraccionamiento',
                'no\\.?': 'Número',
                'num\\.?': 'Número',
                '#': 'Número',
                'int\\.?': 'Interior',
                'ext\\.?': 'Exterior',
                'depto\\.?': 'Departamento',
                'dept\\.?': 'Departamento',
                'piso\\.?': 'Piso',
                'mz\\.?': 'Manzana',
                'lt\\.?': 'Lote',
                'km\\.?': 'Kilómetro',
                'cp\\.?': 'C.P.',
                'c\\.p\\.?': 'C.P.'
            };
            
            Object.entries(addressReplacements).forEach(([pattern, replacement]) => {
                const regex = new RegExp(`\\b${pattern}\\b`, 'gi');
                normalized = normalized.replace(regex, replacement);
            });
            
            // Title case for address
            normalized = normalized.toLowerCase()
                .split(' ')
                .map(word => {
                    if (['de', 'del', 'la', 'las', 'los', 'el', 'y', 'e', 'con'].includes(word)) {
                        return word;
                    }
                    return word.charAt(0).toUpperCase() + word.slice(1);
                })
                .join(' ');
        }
        
        // General text cleanup
        normalized = normalized
            .replace(/\s+/g, ' ') // Multiple spaces to single space
            .replace(/[""]/g, '"') // Normalize quotes
            .replace(/['']/g, "'") // Normalize apostrophes
            .trim();
        
        return normalized;
    };

    // Función para formatear valores
    const formatValue = (value) => {
        if (value === null || value === undefined) return 'N/A';
        if (typeof value === 'string') return value;
        if (typeof value === 'number') return value.toString();
        if (typeof value === 'boolean') return value.toString();
        if (value instanceof Date) return value.toLocaleDateString();
        if (Array.isArray(value)) {
            return value.map(item => 
                typeof item === 'object' ? JSON.stringify(item, null, 2) : item
            ).join(', ');
        }
        if (typeof value === 'object') {
            try {
                // Formatear objetos de manera más legible
                return Object.entries(value)
                    .map(([k, v]) => {
                        const formattedValue = typeof v === 'object' ? JSON.stringify(v, null, 2) : v;
                        return `${k}: ${formattedValue}`;
                    })
                    .join('\n');
            } catch (err) {
                console.error('Error formatting object:', err);
                return 'Invalid Object';
            }
        }
        return 'N/A';
    };

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
            setError('Por favor selecciona una tabla válida primero');
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
                columns = targetTable.columns
                    .filter(col => col.name !== 'id')
                    .map(col => col.name);
            }

            const prompt = {
                text: parsedData.text,
                tables: [targetTable],
                metadata: parsedData.metadata,
                targetColumns: columns,
                tableName: tableName,
                tableType: tableInfo.type || 'simple',
                instructions: `
                    Por favor analiza el documento y extrae la siguiente información:
                    ${columns.map(col => `- ${col}: Encuentra el valor exacto en el texto`).join('\n')}
                    
                    Reglas importantes:
                    1. Extrae valores EXACTOS del documento
                    2. No repitas valores en diferentes campos
                    3. Devuelve null si no se puede encontrar un valor
                    4. Para fechas, mantén el formato como se muestra en el documento
                    5. Para valores monetarios, incluye la cantidad completa con decimales
                    6. Para campos de texto, extrae el texto completo como se muestra
                    ${tableInfo.type === 'simple' ? '7. Esta es una tabla de póliza simple, enfócate en información básica de la póliza' : ''}
                    
                    REGLAS DE NORMALIZACIÓN DE TEXTO:
                    8. NOMBRES DE ASEGURADORA: Siempre normaliza "Grupo Nacional Provincial, S.A.B.", "Grupo Nacional Provincial S.A.B.", "Grupo Nación Aprovincial", "Grupo Nacional Aprovincial", "GNP Seguros", "G.N.P.", o cualquier variación a "GNP"
                    9. NOMBRES DE PERSONAS: Convierte a formato Título Apropiado (ej., "JUAN PÉREZ LÓPEZ" → "Juan Pérez López", mantén "de", "del", "la" en minúsculas)
                    10. DIRECCIONES: Estandariza abreviaciones (Av. → Avenida, Col. → Colonia, No. → Número, etc.) y usa formato Título
                    11. CAMPOS RFC: Mantén el RFC exactamente como se encuentra, solo en mayúsculas y sin espacios extra
                    12. TEXTO GENERAL: Limpia espacios extra, normaliza comillas y apostrofes
                    13. NO normalices valores RFC más allá de mayúsculas y quitar espacios
                    
                    NORMALIZACIÓN ESPECÍFICA POR CAMPO:
                    - contratante, nombre: Aplicar normalización de nombres (formato Título)
                    - direccion: Aplicar normalización de direcciones (estandarizar abreviaciones + formato Título)
                    - rfc: Solo mayúsculas y quitar espacios, sin otros cambios
                    - Todos los demás campos de texto: Aplicar limpieza general de texto y normalización de nombres de compañías
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
                const cleanData = {};
                columns.forEach(column => {
                    let value = result.mappedData[column] || null;
                    
                    // Apply normalization based on field type
                    if (value && typeof value === 'string') {
                        if (column.toLowerCase().includes('rfc')) {
                            value = normalizeText(value, 'rfc');
                        } else if (column.toLowerCase().includes('nombre') || column.toLowerCase().includes('contratante')) {
                            value = normalizeText(value, 'name');
                        } else if (column.toLowerCase().includes('direccion') || column.toLowerCase().includes('address')) {
                            value = normalizeText(value, 'address');
                        } else {
                            value = normalizeText(value, 'general');
                        }
                    }
                    
                    cleanData[column] = value;
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

            console.log('Starting data insertion with raw data:', data);
            console.log('Table name:', tableName);
            console.log('Table info:', tableInfo);

            // Get the correct columns based on table type
            let targetColumns;
            if (tableInfo.type === 'simple') {
                targetColumns = tableInfo.fields;
            } else if (tableInfo.type === 'group') {
                targetColumns = tableInfo.childFields;
            }

            console.log('Target columns:', targetColumns);

            if (!targetColumns) {
                throw new Error('No columns defined for table');
            }

            // Filter data to only include valid columns
            const cleanData = {};
            targetColumns.forEach(columnName => {
                if (data[columnName] !== undefined) {
                    let value = data[columnName];
                    console.log(`Processing column ${columnName} with value:`, value);
                    console.log(`Value type:`, typeof value);

                    // Apply text normalization first (before type-specific processing)
                    if (typeof value === 'string' && !fieldTypes.numeric.includes(columnName) && !fieldTypes.date.includes(columnName)) {
                        if (columnName.toLowerCase().includes('rfc')) {
                            value = normalizeText(value, 'rfc');
                        } else if (columnName.toLowerCase().includes('nombre') || columnName.toLowerCase().includes('contratante')) {
                            value = normalizeText(value, 'name');
                        } else if (columnName.toLowerCase().includes('direccion') || columnName.toLowerCase().includes('address')) {
                            value = normalizeText(value, 'address');
                        } else {
                            value = normalizeText(value, 'general');
                        }
                        console.log(`Text field ${columnName} normalized:`, value);
                    }

                    // Handle different field types
                    if (fieldTypes.numeric.includes(columnName)) {
                        const numStr = value?.toString().replace(/[$,]/g, '') || '0';
                        value = parseFloat(numStr) || null;
                        console.log(`Numeric field ${columnName} processed:`, value);
                    } else if (fieldTypes.date.includes(columnName)) {
                        try {
                            if (typeof value === 'string') {
                                if (value.includes('/')) {
                                    // Convert DD/MM/YYYY to YYYY-MM-DD
                                    const [day, month, year] = value.split('/');
                                    value = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                                } else if (value.includes('-')) {
                                    // If already in YYYY-MM-DD format, keep it
                                    value = value;
                                }
                            } else if (value instanceof Date) {
                                value = value.toISOString().split('T')[0];
                            }
                            console.log(`Date field ${columnName} processed:`, value);
                        } catch (e) {
                            console.warn(`Failed to parse date: ${value}`, e);
                            value = null;
                        }
                    } else if (fieldTypes.status.includes(columnName)) {
                        const status = value?.toString().toLowerCase();
                        value = status === 'pagado' || status === 'paid' ? 'Pagado' : 'No Pagado';
                        console.log(`Status field ${columnName} processed:`, value);
                    } else if (typeof value === 'object' && value !== null) {
                        // For object values, stringify them
                        value = JSON.stringify(value);
                        console.log(`Object field ${columnName} stringified:`, value);
                    }

                    cleanData[columnName] = value;
                }
            });

            console.log('Final clean data before insertion:', cleanData);
            console.log('Clean data structure:', Object.keys(cleanData));
            
            try {
                const result = await tableService.insertData(tableName, cleanData);
                console.log('Data insertion result:', result);
                
                setMessage('Datos insertados exitosamente');
                setError(null);

                const event = new CustomEvent('policyDataUpdated', {
                    detail: { table: tableName }
                });
                window.dispatchEvent(event);
            } catch (insertError) {
                console.error('Error during data insertion:', insertError);
                console.error('Error details:', {
                    message: insertError.message,
                    stack: insertError.stack
                });
                
                // Show more detailed error message
                const errorMessage = insertError.message || 'Failed to insert data';
                setError(`Error inserting data into ${tableName}: ${errorMessage}`);
                setMessage(null);
            }
        } catch (err) {
            console.error('Error preparing data for insertion:', err);
            console.error('Error details:', {
                message: err.message,
                stack: err.stack
            });
            setError(err.message || 'Failed to prepare data for insertion');
            setMessage(null);
        }
    };

    const handleCellEdit = (column, value) => {
        let processedValue = value;
        
        // Handle JSON parsing first
        if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
            try {
                processedValue = JSON.parse(value);
            } catch (err) {
                // Keep as string if JSON parsing fails
                console.warn('Failed to parse JSON:', err);
            }
        }
        
        // Apply text normalization for string values
        if (typeof processedValue === 'string') {
            if (column.toLowerCase().includes('rfc')) {
                processedValue = normalizeText(processedValue, 'rfc');
            } else if (column.toLowerCase().includes('nombre') || column.toLowerCase().includes('contratante')) {
                processedValue = normalizeText(processedValue, 'name');
            } else if (column.toLowerCase().includes('direccion') || column.toLowerCase().includes('address')) {
                processedValue = normalizeText(processedValue, 'address');
            } else {
                processedValue = normalizeText(processedValue, 'general');
            }
        }
        
        setEditedData(prev => ({
            ...prev,
            [column]: processedValue
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

            {mappedData && (
                <div className="mapped-data">
                    <h3>Extracted Data</h3>
                    <div className="data-table">
                        <table>
                            <thead>
                                <tr>
                                    <th className="email-column">
                                        <div className="header-content">
                                            <span>Email</span>
                                        </div>
                                    </th>
                                    {Object.keys(mappedData).map(column => (
                                        <th key={column} className="sortable-header">
                                            <div className="th-content">
                                                <span>{column}</span>
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="table-row">
                                    <td className="email-cell">
                                        <button className="email-icon-btn" title="Send Email" disabled>
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="email-icon">
                                                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                                                <path d="M22 6l-10 7L2 6" />
                                            </svg>
                                        </button>
                                    </td>
                                    {Object.entries(editedData || {}).map(([key, value]) => (
                                        <td key={key} 
                                            className={`editable-cell ${key === 'id' ? 'id-cell' : ''} ${
                                                key === 'status' ? 'status-cell' : ''
                                            }`}
                                            onClick={() => setEditingCell(key)}
                                        >
                                            {editingCell === key ? (
                                                <input
                                                    type="text"
                                                    value={typeof value === 'object' ? JSON.stringify(value, null, 2) : (value || '')}
                                                    onChange={(e) => {
                                                        let newValue = e.target.value;
                                                        try {
                                                            if ((newValue.startsWith('{') && newValue.endsWith('}')) ||
                                                                (newValue.startsWith('[') && newValue.endsWith(']'))) {
                                                                newValue = JSON.parse(newValue);
                                                            }
                                                        } catch (err) {
                                                            console.warn('Failed to parse JSON:', err);
                                                        }
                                                        handleCellEdit(key, newValue);
                                                    }}
                                                    onBlur={() => setEditingCell(null)}
                                                    onKeyDown={(e) => handleKeyDown(e, key)}
                                                    className="edit-cell-input"
                                                    autoFocus
                                                />
                                            ) : (
                                                <span className={`cell-content ${typeof value === 'object' ? 'object-value' : ''}`}>
                                                    {formatValue(value)}
                                                </span>
                                            )}
                                        </td>
                                    ))}
                                </tr>
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