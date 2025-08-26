import React, { useState } from 'react';
import pdfService from '../../services/pdfService';
import './CellPDFParser.css';

const CellPDFParser = ({ columnName, tableName, onValueExtracted }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState('');

  const handlePdfUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError('Por favor selecciona un archivo PDF');
      return;
    }

    setIsAnalyzing(true);
    setError('');
    
    try {
      // Parse PDF content
      const data = await pdfService.parsePDF(file);
      
      // Create simplified prompt specifically for the column
      const prompt = {
        text: data.text,
        metadata: data.metadata,
        targetColumns: [columnName], // Corregido: usar 'targetColumns' como espera el backend
        tableName: tableName || 'default_table', // Usar el tableName real pasado como prop
        tableInfo: {
          type: 'simple',
          columns: [columnName]
        },
        instructions: `
                    Por favor analiza el documento y extrae la siguiente información:
                    ${[columnName].map(col => {
                      if (col === 'pago_parcial') {
                        console.log('🚨 DEBUG: Generating special prompt for pago_parcial column');
                        return `- ${col}: ¡IMPORTANTE! Este es un AVISO DE PAGO/RECIBO. DEBES encontrar el MONTO TOTAL que se debe pagar. Busca TODOS los números con formato de dinero ($1,234.56, 2,500.00, etc.) y selecciona el MÁS GRANDE. NUNCA devuelvas 0.00 o null - SIEMPRE hay un total a pagar en estos documentos.`;
                      }
                      return `- ${col}: Encuentra el valor exacto en el texto`;
                    }).join('\n')}
                    
                    Reglas importantes:
                    1. Extrae valores EXACTOS del documento
                    2. No repitas valores en diferentes campos
                    3. Para pago_parcial: NUNCA devuelvas null, 0.00, o valores vacíos - SIEMPRE encuentra al menos un monto de dinero
                    4. Para otros campos: Devuelve null si no se puede encontrar un valor
                    5. Para fechas, mantén el formato como se muestra en el documento
                    6. Para valores monetarios, incluye la cantidad completa con decimales
                    6. Para campos de texto, extrae el texto completo como se muestra
                    
                    REGLAS ESPECÍFICAS PARA EMAIL:
                    7. PARA CAMPOS EMAIL: NO captures emails de compañías de seguros (como @gnp.com.mx, @axa.com.mx, @qualitas.com.mx, etc.)
                    8. PARA CAMPOS EMAIL: Solo captura emails personales del contratante/asegurado (gmail.com, hotmail.com, yahoo.com, outlook.com, etc.)
                    9. PARA CAMPOS EMAIL: Si solo encuentras emails corporativos de aseguradoras, devuelve null
                    
                    REGLAS ESPECÍFICAS PARA NOMBRES:
                    10. DISTINGUIR ENTRE CLIENTE Y PROPIETARIO: Cuando el documento mencione tanto "cliente" como "propietario" o "titular", captura ambos por separado
                    11. CAMPO "contratante": Usar el nombre del CLIENTE (quien contrata la póliza)
                    12. CAMPO "propietario" o "titular": Usar el nombre del PROPIETARIO del vehículo/inmueble
                    13. Si ambos son la misma persona, usar el mismo nombre en ambos campos
                    
                    REGLAS ESPECÍFICAS PARA PAGOS:
                    14. CAMPO "pago_parcial": ¡CRÍTICO! Este documento es un AVISO DE PAGO/RECIBO - SIEMPRE tiene un total
                    15. Busca TODOS los números con formato de dinero en el documento (ej: $1,500.00, 2,300.50, $500, 1500.00, 2300.50)
                    16. Términos específicos a buscar: "Total", "Total a Pagar", "Importe Total", "Monto Total", "Prima Total", "Pago Total", "Cantidad Total", "Suma Total", "Importe", "Monto", "Prima", "Pago", "Cantidad", "Suma"
                    17. Busca números precedidos por: "$", "MXN", "pesos", "Total:", "Importe:", "Monto:", o simplemente números grandes
                    18. Si encuentras múltiples cantidades, SIEMPRE usa el NÚMERO MÁS GRANDE (que es el total)
                    19. PROHIBIDO devolver 0.00, null, o valores vacíos para pago_parcial
                    20. Si no encuentras un total específico, busca CUALQUIER número que parezca un monto de dinero
                    21. EJEMPLO: Si ves "Aviso de Pago", "Recibo", "Factura" - SIEMPRE contiene un total a pagar
                    22. Busca patrones como: "$1,234.56", "Total: 2,500", "Importe Total 1500.00", "Prima Total $800", "1500.00", "2,500"
                    23. Si el documento menciona "Gastos Médicos", "Seguro", "Póliza" - SIEMPRE hay un monto a pagar
                    
                    REGLAS DE NORMALIZACIÓN DE TEXTO:
                    18. NOMBRES DE ASEGURADORA: Siempre normaliza "Grupo Nacional Provincial, S.A.B.", "Grupo Nacional Provincial S.A.B.", "Grupo Nación Aprovincial", "Grupo Nacional Aprovincial", "GNP Seguros", "G.N.P.", o cualquier variación a "GNP"
                    19. NOMBRES DE PERSONAS: Convierte a formato Título Apropiado (ej., "JUAN PÉREZ LÓPEZ" → "Juan Pérez López", mantén "de", "del", "la" en minúsculas)
                    20. DIRECCIONES: Estandariza abreviaciones (Av. → Avenida, Col. → Colonia, No. → Número, etc.) y usa formato Título
                    21. CAMPOS RFC: Mantén el RFC exactamente como se encuentra, solo en mayúsculas y sin espacios extra
                    22. TEXTO GENERAL: Limpia espacios extra, normaliza comillas y apostrofes
                    23. NO normalices valores RFC más allá de mayúsculas y limpieza de espacios
                    
                    NORMALIZACIÓN ESPECÍFICA POR CAMPO:
                    - contratante: Usar nombre del CLIENTE (quien contrata), aplicar normalización de nombres (formato Título)
                    - propietario/titular: Usar nombre del PROPIETARIO del vehículo/inmueble, aplicar normalización de nombres (formato Título)
                    - direccion: Aplicar normalización de direcciones (estandarizar abreviaciones + formato Título)
                    - rfc: Solo mayúsculas y quitar espacios, sin otros cambios
                    - email: Solo emails personales, evitar emails corporativos de aseguradoras
                    - aseguradora: Aplicar normalización de nombres de aseguradoras (principalmente GNP)
                    - pago_parcial: ¡CRÍTICO! Captura el TOTAL del recibo/factura/aviso de pago - NUNCA devolver null, 0.00, o valores vacíos - SIEMPRE buscar el monto total a pagar
                    - Todos los demás campos de texto: Aplicar limpieza general de texto y normalización de nombres de compañías
                `
      };

      // Call GPT analysis endpoint using relative URL (will be proxied by Vite)
      const response = await fetch('/api/gpt/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(prompt),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server response:', errorText);
        throw new Error(`Error del servidor: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ GPT Analysis result:', result);
      
      // Debug: Log the full prompt that was sent
      console.log('🔍 DEBUG: Prompt sent to GPT:', JSON.stringify(prompt, null, 2));
      
      // Check multiple possible response formats
      let extractedValue = null;
      
      console.log('🔍 Full GPT result:', result);
      
      // Check in mappedData
      if (result.mappedData && result.mappedData[columnName] !== undefined) {
        extractedValue = result.mappedData[columnName];
        console.log('📋 Found in mappedData:', extractedValue);
      } 
      // Check in columnAnalysis (new format)
      else if (result.columnAnalysis && result.columnAnalysis[columnName]) {
        extractedValue = result.columnAnalysis[columnName].extractedValue;
        console.log('📋 Found in columnAnalysis:', extractedValue);
      }
      // Check directly in result
      else if (result[columnName] !== undefined) {
        extractedValue = result[columnName];
        console.log('📋 Found directly in result:', extractedValue);
      } 
      // Check in data property
      else if (result.data && result.data[columnName] !== undefined) {
        extractedValue = result.data[columnName];
        console.log('📋 Found in data:', extractedValue);
      }
      
      if (extractedValue !== null) {
        onValueExtracted(extractedValue || '');
        console.log(`✅ Extracted value for ${columnName}:`, extractedValue);
      } else {
        setError(`No se pudo extraer el valor para '${columnName}' del PDF`);
        console.warn(`❌ No value found for column '${columnName}' in result:`, result);
      }
      
    } catch (err) {
      console.error('❌ Error analyzing PDF:', err);
      setError(`Error al analizar PDF: ${err.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="cell-pdf-parser">
      <div className="column-info">
        <strong>Extrayendo: {columnName}</strong>
        <p>Tabla: {tableName} • Sube un PDF para extraer automáticamente el valor de esta columna</p>
      </div>
      
      {error && (
        <div className="error-message" style={{ 
          color: '#dc3545', 
          backgroundColor: '#f8d7da', 
          border: '1px solid #f5c6cb',
          padding: '8px',
          borderRadius: '4px',
          marginBottom: '10px',
          fontSize: '14px'
        }}>
          {error}
        </div>
      )}
      
      <label className="file-input-label">
        <input
          type="file"
          accept=".pdf"
          onChange={handlePdfUpload}
          disabled={isAnalyzing}
          className="file-input"
        />
        <span className="file-input-text">
          {isAnalyzing ? `🔄 Analizando PDF para ${columnName}...` : `📄 Seleccionar PDF para ${columnName}`}
        </span>
      </label>
      
      {isAnalyzing && (
        <div className="analyzing-status" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginTop: '10px',
          color: '#0066cc',
          fontSize: '14px'
        }}>
          <div style={{
            width: '16px',
            height: '16px',
            border: '2px solid #f3f3f3',
            borderTop: '2px solid #0066cc',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          Procesando PDF y extrayendo '{columnName}'...
        </div>
      )}
    </div>
  );
};

export default CellPDFParser; 