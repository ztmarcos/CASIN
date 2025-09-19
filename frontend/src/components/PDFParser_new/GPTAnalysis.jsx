import React, { useState, useEffect } from 'react';
import firebaseTableService from '../../services/firebaseTableService';
import { API_URL, GPT_API_URL } from '../../config/api.js';
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

    // Insurance company name normalization function
    const normalizeInsuranceCompany = (companyName) => {
        if (!companyName || typeof companyName !== 'string') return companyName;
        
        const companyNormalizations = {
            // GNP variations
            'GNP': [
                /grupo\s+nacional\s+provincial\s*,?\s*s\.a\.b\.?/gi,
                /grupo\s+naci[oó]n\s+aprovincial/gi,
                /grupo\s+nacional\s+aprovincial/gi,
                /gnp\s+seguros/gi,
                /g\.n\.p\.?/gi,
                /grupo\s+nacion\s+aprovincial/gi,
                /grupo\s+nacional\s+provincial/gi
            ],
            // Qualitas variations
            'Qualitas': [
                /quálitas\s+compañía\s+de\s+seguros\s*,?\s*s\.a\.\s*de\s*c\.v\.?/gi,
                /quálitas\s+compañía\s+de\s+seguros/gi,
                /quálitas\s+seguros/gi,
                /quálitas/gi
            ],
            // SURA variations
            'SURA': [
                /seguros\s+sura\s*,?\s*s\.a\.\s*de\s*c\.v\.?/gi,
                /seguros\s+sura/gi,
                /sura\s+seguros/gi,
                /sura/gi
            ],
            // AXA variations
            'AXA': [
                /axa\s+seguros/gi,
                /axa\s+assistance/gi,
                /axa/gi
            ],
            // Metlife variations
            'Metlife': [
                /metlife\s+seguros/gi,
                /metlife/gi
            ],
            // Mapfre variations
            'Mapfre': [
                /mapfre\s+seguros/gi,
                /mapfre/gi
            ],
            // HDI variations
            'HDI': [
                /hdi\s+seguros/gi,
                /hdi/gi
            ],
            // Zurich variations
            'Zurich': [
                /zurich\s+seguros/gi,
                /zurich/gi
            ],
            // BBVA Bancomer variations
            'BBVA Bancomer': [
                /bbva\s+bancomer\s+seguros/gi,
                /bbva\s+seguros/gi,
                /bancomer\s+seguros/gi
            ]
        };
        
        let normalized = companyName.trim();
        
        // Apply all company normalizations
        Object.entries(companyNormalizations).forEach(([normalizedName, patterns]) => {
            patterns.forEach(pattern => {
                if (pattern.test(normalized)) {
                    normalized = normalized.replace(pattern, normalizedName);
                }
            });
        });
        
        return normalized;
    };

    // Comprehensive text normalization function
    const normalizeText = (text, fieldType = 'general') => {
        if (!text || typeof text !== 'string') return text;
        
        // Don't normalize RFC fields
        if (fieldType === 'rfc') return text.toUpperCase().trim();
        
        let normalized = text;
        
        // Basic cleanup
        normalized = normalized.trim();
        
        // Apply insurance company normalization
        normalized = normalizeInsuranceCompany(normalized);
        
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
        // More permissive handling - show empty string for null/undefined instead of N/A
        if (value === null || value === undefined || value === '') return '';
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
        return value.toString();
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
            
            // Debug: Check if we have valid PDF data
            if (!parsedData || !parsedData.text) {
                throw new Error('No PDF text data available for analysis');
            }
            
            if (parsedData.text.length < 50) {
                throw new Error('PDF text too short - may not have been extracted properly');
            }

            // Debug: Log the PDF text being sent
            console.log('🔍 PDF TEXT DEBUG:');
            console.log('- Text length:', parsedData.text?.length);
            console.log('- Text preview:', parsedData.text?.substring(0, 500) + '...');
            console.log('- Has meaningful content:', parsedData.text?.length > 100);
            
            console.log('🔍 PROMPT DEBUG:');
            console.log('- Using backend default prompt (no custom instructions)');
            console.log('- Target columns:', columns.length);
            
            const prompt = {
                text: parsedData.text,
                tables: [targetTable],
                metadata: parsedData.metadata,
                targetColumns: columns,
                tableName: tableName,
                tableType: tableInfo.type || 'simple'
                // No instructions - let backend use its simpler prompt
            };

            const response = await fetch(`${GPT_API_URL}/gpt/analyze`, {
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
            
            // DETAILED DEBUG LOGGING
            console.log('🔍 DETAILED RESPONSE DEBUG:');
            console.log('- result.success:', result.success);
            console.log('- result.extractedData keys:', result.extractedData ? Object.keys(result.extractedData) : 'NO extractedData');
            console.log('- result.extractedData values:', result.extractedData ? Object.values(result.extractedData) : 'NO extractedData');
            console.log('- result.columnAnalysis keys:', result.columnAnalysis ? Object.keys(result.columnAnalysis) : 'NO columnAnalysis');
            
            if (result.columnAnalysis) {
                Object.entries(result.columnAnalysis).forEach(([col, analysis]) => {
                    console.log(`📋 Column ${col}:`, {
                        extractedValue: analysis.extractedValue,
                        hasValue: analysis.hasValue,
                        sampleValues: analysis.sampleValues
                    });
                });
            }

            if (result.success && result.columnAnalysis) {
                // Convert backend analysis to frontend format
                const cleanData = {};
                
                // Debug: Log the raw response structure
                console.log('🔍 RAW result.extractedData:', result.extractedData);
                console.log('🔍 RAW result.columnAnalysis:', result.columnAnalysis);
                
                // For OpenAI analysis, use extractedData directly
                if (result.extractedData && Object.keys(result.extractedData).length > 0) {
                    console.log('📊 Using OpenAI extracted data:', result.extractedData);
                    Object.assign(cleanData, result.extractedData);
                } else {
                    console.log('📊 Using column analysis fallback');
                    // Fallback: Extract sample values from each column analysis
                    Object.entries(result.columnAnalysis).forEach(([column, analysis]) => {
                        console.log(`🔍 Processing column ${column}:`, analysis);
                        
                        // Try multiple sources for the value
                        let value = null;
                        
                        if (analysis.extractedValue !== undefined && analysis.extractedValue !== null) {
                            value = analysis.extractedValue;
                            console.log(`✅ Using extractedValue for ${column}:`, value);
                        } else if (analysis.sampleValues && analysis.sampleValues.length > 0) {
                            value = analysis.sampleValues[0];
                            console.log(`✅ Using sampleValue for ${column}:`, value);
                        } else if (analysis.detectedValue !== undefined && analysis.detectedValue !== null) {
                            value = analysis.detectedValue;
                            console.log(`✅ Using detectedValue for ${column}:`, value);
                        } else if (analysis.value !== undefined && analysis.value !== null) {
                            value = analysis.value;
                            console.log(`✅ Using value for ${column}:`, value);
                        }
                        
                        cleanData[column] = value;
                    });
                }

                console.log('📊 Processed analysis data:', cleanData);
                console.log('📈 Analysis summary:', result.summary);
                
                // EXTRA DEBUG: Show what we actually got in cleanData
                console.log('🔍 FINAL cleanData contents:');
                Object.entries(cleanData).forEach(([key, value]) => {
                    console.log(`  ${key}: ${value} (type: ${typeof value})`);
                });

                // Check if cleanData has mostly null values and provide fallback
                const nullCount = Object.values(cleanData).filter(v => v === null || v === undefined).length;
                const totalCount = Object.keys(cleanData).length;
                const hasLowExtractionRate = (nullCount / totalCount) > 0.8; // More than 80% null
                
                if (Object.keys(cleanData).length === 0 || hasLowExtractionRate) {
                    console.log('⚠️ No data extracted, trying to use sample data from analysis');
                    
                    // Create sample editable data so user can see the structure
                    if (result.columnAnalysis) {
                        Object.entries(result.columnAnalysis).forEach(([column, analysis]) => {
                            if (!cleanData[column] || cleanData[column] === null) {
                                // Provide sample/placeholder values based on column names
                                if (column.includes('nombre') || column.includes('contratante') || column.includes('asegurado')) {
                                    cleanData[column] = 'Click para editar nombre';
                                } else if (column.includes('email') || column.includes('e_mail')) {
                                    cleanData[column] = 'usuario@email.com';
                                } else if (column.includes('fecha') || column.includes('vigencia')) {
                                    cleanData[column] = '01/01/2024';
                                } else if (column.includes('poliza') || column.includes('numero')) {
                                    cleanData[column] = '123456';
                                } else if (column.includes('aseguradora')) {
                                    cleanData[column] = 'GNP';
                                } else if (column.includes('prima') || column.includes('pago') || column.includes('importe')) {
                                    cleanData[column] = '0.00';
                                } else {
                                    cleanData[column] = 'Click para editar';
                                }
                            }
                        });
                    }
                    
                    console.log('📊 Fallback editable data applied:', cleanData);
                }

                setAnalysis(result);
                setMappedData(cleanData);
            } else {
                console.error('❌ Invalid response structure:', result);
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
                        } else if (columnName.toLowerCase().includes('aseguradora') || columnName.toLowerCase().includes('compañía') || columnName.toLowerCase().includes('company')) {
                            // Special handling for insurance company fields
                            value = normalizeInsuranceCompany(value);
                            console.log(`Insurance company field ${columnName} normalized:`, value);
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

            // Transform nombre_contratante to contratante for all tables
            if (cleanData.nombre_contratante) {
                cleanData.contratante = cleanData.nombre_contratante;
                delete cleanData.nombre_contratante;
                console.log('Transformed nombre_contratante to contratante');
            }

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
            } else if (column.toLowerCase().includes('aseguradora') || column.toLowerCase().includes('compañía') || column.toLowerCase().includes('company')) {
                // Special handling for insurance company fields
                processedValue = normalizeInsuranceCompany(processedValue);
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