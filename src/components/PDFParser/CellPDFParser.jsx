import React, { useState } from 'react';
import pdfService from '../../services/pdfService';
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
          Please analyze the document and extract the following information:
          - ${columnName}: Find the exact value in the text
          
          Important rules:
          1. Extract EXACT values from the document
          2. Return null if a value cannot be found
          3. For dates, maintain the format as shown in the document
          4. For currency values, include the full amount with decimals
          5. For text fields, extract the complete text as shown
        `
      };

      // Call GPT analysis endpoint
      const response = await fetch('http://localhost:3001/api/gpt/analyze', {
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
        placeholder={`Custom instructions for extracting ${columnName} from PDF...`}
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
          {isAnalyzing ? 'Analyzing...' : 'Choose PDF File'}
        </span>
      </label>
    </div>
  );
};

export default CellPDFParser; 