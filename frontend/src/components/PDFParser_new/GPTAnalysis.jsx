import React, { useState, useEffect } from 'react';
import firebaseTableService from '../../services/firebaseTableService';
import { API_URL } from '../../config/api.js';
import './GPTAnalysis.css';
import { notifyDataInsert } from '../../utils/dataUpdateNotifier';


const GPTAnalysis = ({ parsedData, selectedTable, tableInfo, autoAnalyze = false, onClose, onOpenEmailModal }) => {
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
            const tables = await firebaseTableService.getTables();
            console.log('Available tables:', tables.map(t => t.name));
            
            const targetTable = tables.find(t => t.name === tableName);
            if (!targetTable) {
                console.error('Table not found:', tableName, 'Available tables:', tables.map(t => t.name));
                throw new Error(`Selected table "${tableName}" not found`);
            }

            // Get columns from table types first (most reliable source)
            let columns;
            
            console.log('Table info:', tableInfo);
            console.log('Target table:', targetTable);
            
            try {
                // Primary source: table types endpoint (most reliable)
                const tableTypes = await firebaseTableService.getTableTypes();
                const tableType = tableTypes[tableName];
                if (tableType && tableType.fields && tableType.fields.length > 0) {
                    columns = tableType.fields;
                    console.log('✅ Using columns from table types:', columns);
                } else {
                    throw new Error('No fields in table types');
                }
            } catch (tableTypesError) {
                console.warn('Could not get columns from table types:', tableTypesError);
                
                // Fallback 1: Extract columns from the table structure
                if (targetTable.columns && Array.isArray(targetTable.columns) && targetTable.columns.length > 0) {
                    // Firebase returns columns array with {name, type, nullable} structure
                    columns = targetTable.columns
                        .filter(col => col.name !== 'id') // Filter out id column
                        .map(col => col.name); // Get just the column names
                    console.log('✅ Using columns from target table:', columns);
                } else if (tableInfo.fields && Array.isArray(tableInfo.fields) && tableInfo.fields.length > 0) {
                    // Fallback 2: tableInfo.fields if available
                    columns = tableInfo.fields;
                    console.log('✅ Using columns from table info fields:', columns);
                } else if (tableInfo.childFields && Array.isArray(tableInfo.childFields) && tableInfo.childFields.length > 0) {
                    // Fallback 3: For group tables, use childFields
                    columns = tableInfo.childFields;
                    console.log('✅ Using columns from table info child fields:', columns);
                } else {
                    throw new Error(`Could not determine columns for table ${tableName} from any source`);
                }
            }

            console.log('Extracted columns for analysis:', columns);
            
            if (!columns || columns.length === 0) {
                throw new Error(`No columns found for table ${tableName}`);
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
                    
                    REGLAS ESPECÍFICAS PARA EMAIL:
                    7. PARA CAMPOS EMAIL: NO captures emails de compañías de seguros (como @gnp.com.mx, @axa.com.mx, @qualitas.com.mx, etc.)
                    8. PARA CAMPOS EMAIL: Solo captura emails personales del contratante/asegurado (gmail.com, hotmail.com, yahoo.com, outlook.com, etc.)
                    9. PARA CAMPOS EMAIL: Si solo encuentras emails corporativos de aseguradoras, devuelve null
                    
                    REGLAS ESPECÍFICAS PARA NOMBRES:
                    10. DISTINGUIR ENTRE CLIENTE Y PROPIETARIO: Cuando el documento mencione tanto "cliente" como "propietario" o "titular", captura ambos por separado
                    11. CAMPO "contratante": Usar el nombre del CLIENTE (quien contrata la póliza)
                    12. CAMPO "propietario" o "titular": Usar el nombre del PROPIETARIO del vehículo/inmueble (puede ser diferente al cliente)
                    13. CAMPO "asegurado": Usar el nombre de la persona ASEGURADA (puede ser cliente, propietario o ambos)
                    14. Si solo hay una persona mencionada, usar el mismo nombre para todos los campos relevantes
                    15. Si hay múltiples personas, identificar claramente el rol de cada una según el contexto del documento
                    
                    REGLAS DE NORMALIZACIÓN DE TEXTO:
                    16. NOMBRES DE ASEGURADORA: Siempre normaliza "Grupo Nacional Provincial, S.A.B.", "Grupo Nacional Provincial S.A.B.", "Grupo Nación Aprovincial", "Grupo Nacional Aprovincial", "GNP Seguros", "G.N.P.", o cualquier variación a "GNP"
                    17. NOMBRES DE PERSONAS: Convierte a formato Título Apropiado (ej., "JUAN PÉREZ LÓPEZ" → "Juan Pérez López", mantén "de", "del", "la" en minúsculas)
                    18. DIRECCIONES: Estandariza abreviaciones (Av. → Avenida, Col. → Colonia, No. → Número, etc.) y usa formato Título
                    19. CAMPOS RFC: Mantén el RFC exactamente como se encuentra, solo en mayúsculas y sin espacios extra
                    20. TEXTO GENERAL: Limpia espacios extra, normaliza comillas y apostrofes
                    21. NO normalices valores RFC más allá de mayúsculas y quitar espacios
                    22. DERECHO DE PÓLIZA: Busca tanto "derecho de póliza" como "gastos de expedición" - ambos se refieren al mismo concepto
                    
                    NORMALIZACIÓN ESPECÍFICA POR CAMPO:
                    - contratante: Usar nombre del CLIENTE (quien contrata), aplicar normalización de nombres (formato Título)
                    - propietario/titular: Usar nombre del PROPIETARIO del vehículo/inmueble, aplicar normalización de nombres (formato Título)
                    - asegurado: Usar nombre de la persona ASEGURADA, aplicar normalización de nombres (formato Título)
                    - direccion: Aplicar normalización de direcciones (estandarizar abreviaciones + formato Título)
                    - rfc: Solo mayúsculas y quitar espacios, sin otros cambios
                    - email: Solo emails personales, evitar emails corporativos de aseguradoras
                    - derecho_de_poliza: Buscar tanto "derecho de póliza" como "gastos de expedición" - ambos son el mismo concepto
                    - Todos los demás campos de texto: Aplicar limpieza general de texto y normalización de nombres de compañías
                `
            };

            const response = await fetch(`${API_URL}/gpt/analyze`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(prompt)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }

            const result = await response.json();
            console.log('✅ GPT Analysis Response:', result);

            if (result.success && result.columnAnalysis) {
                // Convert backend analysis to frontend format
                const cleanData = {};
                
                // For OpenAI analysis, use extractedData directly
                if (result.extractedData) {
                    console.log('📊 Using OpenAI extracted data:', result.extractedData);
                    Object.assign(cleanData, result.extractedData);
                } else {
                    // Fallback: Extract sample values from each column analysis
                    Object.entries(result.columnAnalysis).forEach(([column, analysis]) => {
                        // Use the first non-empty sample value as default
                        if (analysis.sampleValues && analysis.sampleValues.length > 0) {
                            cleanData[column] = analysis.sampleValues[0];
                        } else if (analysis.extractedValue !== undefined) {
                            cleanData[column] = analysis.extractedValue;
                        } else {
                            cleanData[column] = null;
                        }
                    });
                }

                console.log('📊 Processed analysis data:', cleanData);
                console.log('📈 Analysis summary:', result.summary);

                setAnalysis(result);
                setMappedData(cleanData);
            } else {
                throw new Error('Invalid response structure from analysis');
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

            // Get the columns using table types first (most reliable source)
            let targetColumns;
            
            try {
                // Primary source: table types endpoint (most reliable)
                const tableTypes = await firebaseTableService.getTableTypes();
                const tableType = tableTypes[tableName];
                if (tableType && tableType.fields && tableType.fields.length > 0) {
                    targetColumns = tableType.fields;
                    console.log('✅ Using target columns from table types:', targetColumns);
                } else {
                    throw new Error('No fields in table types');
                }
            } catch (tableTypesError) {
                console.warn('Could not get target columns from table types:', tableTypesError);
                
                try {
                    // Fallback: get from tables structure
                    const tables = await firebaseTableService.getTables();
                    const targetTable = tables.find(t => t.name === tableName);
                    
                    if (!targetTable) {
                        throw new Error(`Table "${tableName}" not found`);
                    }

                    // Extract columns from the actual table structure
                    if (targetTable.columns && Array.isArray(targetTable.columns) && targetTable.columns.length > 0) {
                        // Firebase returns columns array with {name, type, nullable} structure
                        targetColumns = targetTable.columns
                            .filter(col => col.name !== 'id') // Filter out id column
                            .map(col => col.name); // Get just the column names
                        console.log('✅ Using target columns from target table:', targetColumns);
                    } else if (tableInfo.fields && Array.isArray(tableInfo.fields) && tableInfo.fields.length > 0) {
                        // Fallback to tableInfo.fields if available
                        targetColumns = tableInfo.fields;
                        console.log('✅ Using target columns from table info fields:', targetColumns);
                    } else if (tableInfo.childFields && Array.isArray(tableInfo.childFields) && tableInfo.childFields.length > 0) {
                        // For group tables, use childFields
                        targetColumns = tableInfo.childFields;
                        console.log('✅ Using target columns from table info child fields:', targetColumns);
                    } else {
                        throw new Error(`Could not determine columns for table ${tableName} from any source`);
                    }
                } catch (tableError) {
                    console.error('Error getting table columns:', tableError);
                    throw new Error('Failed to get table column information');
                }
            }

            console.log('Target columns for insertion:', targetColumns);

            if (!targetColumns || targetColumns.length === 0) {
                throw new Error(`No columns found for table ${tableName}`);
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
                const result = await firebaseTableService.insertData(tableName, cleanData);
                console.log('Data insertion result:', result);
                
                setMessage('Datos insertados exitosamente');
                setError(null);

                // Data will be sent via custom event to TableMail

                // Notify data table about the new data insertion and close modal
                const event = new CustomEvent('policyDataUpdated', {
                    detail: { table: tableName, shouldCloseModal: true }
                });
                window.dispatchEvent(event);
                
                // Also trigger the new notification system
                notifyDataInsert(tableName);
                
                // Open TableMail modal in DataTable component via callback
                setTimeout(() => {
                    console.log('🚀 Opening TableMail modal automatically');
                    console.log('📧 Data to pass to TableMail:', cleanData);
                    console.log('📧 ¡ABRIENDO MODAL DE EMAIL AUTOMÁTICAMENTE - ESTILO DATATABLE!');
                    
                    // Use callback to trigger TableMail modal in DataTable
                    if (onOpenEmailModal) {
                        onOpenEmailModal(cleanData);
                    } else {
                        console.warn('⚠️ onOpenEmailModal callback not available');
                    }
                }, 1200); // Give time to see success message
                
                // Close GPTAnalysis modal after dispatching the email event
                if (onClose) {
                    setTimeout(() => {
                        console.log('🔒 Closing GPTAnalysis modal - TableMail should open in DataTable');
                        onClose();
                    }, 1500); // Close sooner since we don't need to keep this open
                }
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
            <div className="gpt-analysis-header">
                <h3>Análisis de Contenido</h3>
                <div className="header-actions">
                    {mappedData && (
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

            {mappedData && (
                <div className="mapped-data">
                    <h4>Datos Extraídos</h4>
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

export default GPTAnalysis; 