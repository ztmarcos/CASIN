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
      
      // DETAILED DEBUG LOGGING
      console.log('🔍 PDF PARSING DEBUG:');
      console.log('- File name:', file.name);
      console.log('- File size:', file.size);
      console.log('- PDF pages:', data.pages);
      console.log('- Text length:', data.text?.length);
      console.log('- Text preview (first 500 chars):', data.text?.substring(0, 500));
      console.log('- Text has content:', data.text && data.text.length > 50);
      console.log('- Metadata:', data.metadata);
      
      if (!data.text || data.text.length < 50) {
        throw new Error(`PDF text extraction failed or too short. Length: ${data.text?.length}`);
      }
      
      // Create simplified prompt specifically for the column
      // NO ENVIAR INSTRUCCIONES PERSONALIZADAS - dejar que el backend use su prompt completo
      const prompt = {
        text: data.text,
        metadata: data.metadata,
        targetColumns: [columnName], // Usar 'targetColumns' como espera el backend
        tableName: tableName || 'default_table', // Usar el tableName real pasado como prop
        tableType: 'simple'
        // NO instructions - let backend use its comprehensive prompt with full PDF text
      };

      // DETAILED REQUEST DEBUG
      console.log('🚀 SENDING REQUEST TO BACKEND:');
      console.log('- URL:', '/api/gpt/analyze');
      console.log('- Method:', 'POST');
      console.log('- Prompt object keys:', Object.keys(prompt));
      console.log('- Text being sent (length):', prompt.text?.length);
      console.log('- Text being sent (preview):', prompt.text?.substring(0, 200) + '...');
      console.log('- Target columns:', prompt.targetColumns);
      console.log('- Table name:', prompt.tableName);
      console.log('- Full prompt object:', JSON.stringify(prompt, null, 2));

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
      
      // Debug: Log the simplified prompt that was sent
      console.log('🔍 DEBUG: Simplified prompt sent to GPT (using backend default):', JSON.stringify(prompt, null, 2));
      
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