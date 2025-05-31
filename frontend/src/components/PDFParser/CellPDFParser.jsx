import React, { useState } from 'react';
import pdfService from '../../services/pdfService';
import { API_URL } from '../../config/api.js';
import './CellPDFParser.css';

const CellPDFParser = ({ columnName, onValueExtracted }) => {
  const [customPrompt, setCustomPrompt] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handlePdfUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      console.error('Please upload a PDF file');
      return;
    }

    setIsAnalyzing(true);
    try {
      // Parse PDF content
      const data = await pdfService.parsePDF(file);
      
      // Create prompt for GPT
      const prompt = {
        text: data.text,
        metadata: data.metadata,
        targetColumns: [columnName],
        tableName: 'current_table',
        instructions: customPrompt || `
          Por favor analiza el documento y extrae la siguiente información:
          - ${columnName}: Encuentra el valor exacto en el texto
          
          Reglas importantes:
          1. Extrae valores EXACTOS del documento
          2. Devuelve null si no se puede encontrar un valor
          3. Para fechas, mantén el formato como se muestra en el documento
          4. Para valores monetarios, incluye la cantidad completa con decimales
          5. Para campos de texto, extrae el texto completo como se muestra
          
          REGLAS DE NORMALIZACIÓN:
          6. NOMBRES DE ASEGURADORA: Normaliza "Grupo Nacional Provincial, S.A.B.", "Grupo Nacional Provincial S.A.B.", "GNP Seguros", "G.N.P." a "GNP"
          7. NOMBRES DE PERSONAS: Formato Título (ej., "JUAN PÉREZ" → "Juan Pérez")
          8. DIRECCIONES: Estandariza abreviaciones (Av. → Avenida, Col. → Colonia)
          9. RFC: Solo mayúsculas y sin espacios extra
        `
      };

      // Call GPT analysis endpoint
      const response = await fetch(`${API_URL}/gpt/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(prompt),
      });

      if (!response.ok) {
        throw new Error('Failed to analyze PDF');
      }

      const result = await response.json();
      
      if (result.mappedData && result.mappedData[columnName] !== undefined) {
        onValueExtracted(result.mappedData[columnName] || '');
      }
    } catch (err) {
      console.error('Error analyzing PDF:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="cell-pdf-parser">
      <textarea
        value={customPrompt}
        onChange={(e) => setCustomPrompt(e.target.value)}
        placeholder={`Instrucciones personalizadas para extraer ${columnName} del PDF...`}
        rows={2}
        className="prompt-textarea"
      />
      <label className="file-input-label">
        <input
          type="file"
          accept=".pdf"
          onChange={handlePdfUpload}
          disabled={isAnalyzing}
          className="file-input"
        />
        <span className="file-input-text">
          {isAnalyzing ? 'Analizando...' : 'Seleccionar Archivo PDF'}
        </span>
      </label>
    </div>
  );
};

export default CellPDFParser; 