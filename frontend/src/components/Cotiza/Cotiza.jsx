import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import './Cotiza.css';

const Cotiza = () => {
  const [files, setFiles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedTexts, setExtractedTexts] = useState([]);
  const [cotizaciones, setCotizaciones] = useState([]);
  const [isGeneratingTable, setIsGeneratingTable] = useState(false);
  const [isGeneratingMail, setIsGeneratingMail] = useState(false);
  const [generatedMail, setGeneratedMail] = useState(null);

  // Tipos de archivo soportados
  const supportedTypes = {
    'application/pdf': 'PDF',
    'application/msword': 'DOC',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
    'text/plain': 'TXT',
    'image/png': 'PNG',
    'image/jpeg': 'JPEG',
    'image/jpg': 'JPG'
  };

  const handleFileUpload = async (event) => {
    const uploadedFiles = Array.from(event.target.files);
    
    // Validar tipos de archivo
    const validFiles = uploadedFiles.filter(file => {
      if (supportedTypes[file.type]) {
        return true;
      }
      toast.error(`Tipo de archivo no soportado: ${file.name}`);
      return false;
    });

    if (validFiles.length > 0) {
      const fileObjects = validFiles.map(file => ({
        file,
        id: Date.now() + Math.random(),
        name: file.name,
        type: supportedTypes[file.type],
        size: file.size,
        status: 'pending'
      }));
      
      setFiles(prev => [...prev, ...fileObjects]);
      toast.success(`${validFiles.length} archivo(s) agregado(s)`);
      
      // Automatically extract text from all uploaded files
      await extractTextFromFiles(fileObjects);
    }
  };

  const removeFile = (id) => {
    setFiles(prev => prev.filter(f => f.id !== id));
    // Also remove from extracted texts
    setExtractedTexts(prev => prev.filter(text => text.fileId !== id));
  };

  const extractTextFromFiles = async (filesToProcess = files) => {
    if (filesToProcess.length === 0) {
      toast.error('No hay archivos para procesar');
      return;
    }

    setIsProcessing(true);
    const newExtractedTexts = [...extractedTexts];

    try {
      for (const fileData of filesToProcess) {
        // Skip if already processed
        if (extractedTexts.some(et => et.fileId === fileData.id)) {
          continue;
        }
        
        // Actualizar status
        setFiles(prev => prev.map(f => 
          f.id === fileData.id ? { ...f, status: 'processing' } : f
        ));

        let extractedText = '';

        if (fileData.type === 'PDF') {
          extractedText = await extractTextFromPDF(fileData.file);
        } else if (['PNG', 'JPEG', 'JPG'].includes(fileData.type)) {
          extractedText = await extractTextFromImage(fileData.file);
        } else if (['TXT', 'DOC', 'DOCX'].includes(fileData.type)) {
          extractedText = await extractTextFromDocument(fileData.file);
        }

        newExtractedTexts.push({
          fileId: fileData.id,
          fileName: fileData.name,
          text: extractedText
        });

        // Actualizar status
        setFiles(prev => prev.map(f => 
          f.id === fileData.id ? { ...f, status: 'completed' } : f
        ));
      }

      setExtractedTexts(newExtractedTexts);
      toast.success('Texto extraído exitosamente');
      
    } catch (error) {
      console.error('Error extracting text:', error);
      toast.error('Error al extraer texto de los archivos');
    } finally {
      setIsProcessing(false);
    }
  };

  const extractTextFromPDF = async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/parse-pdf', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to parse PDF');
      }

      const result = await response.json();
      return result.text || 'No se pudo extraer texto del PDF';
    } catch (error) {
      console.error('PDF parsing error:', error);
      return 'Error al procesar PDF: ' + error.message;
    }
  };

  const extractTextFromImage = async (file) => {
    const base64 = await fileToBase64(file);
    
    try {
      const response = await fetch('/api/analyze-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          image: base64,
          prompt: 'Extrae todo el texto visible en esta imagen. Si es un documento de seguros, identifica información relevante como coberturas, primas, deducibles, etc.'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to analyze image');
      }

      const result = await response.json();
      return result.text || 'No se pudo extraer texto de la imagen';
    } catch (error) {
      console.error('Image analysis error:', error);
      return 'Error al analizar imagen: ' + error.message;
    }
  };

  const extractTextFromDocument = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(e);
      reader.readAsText(file);
    });
  };

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = (error) => reject(error);
    });
  };

  const generateCotizaciones = async () => {
    if (extractedTexts.length === 0) {
      toast.error('Primero extrae el texto de los archivos');
      return;
    }

    setIsGeneratingTable(true);

    try {
      const combinedText = extractedTexts.map(et => 
        `Archivo: ${et.fileName}\n${et.text}`
      ).join('\n\n---\n\n');

      const response = await fetch('/api/generate-quote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          documentText: combinedText,
          prompt: `
Analiza los siguientes documentos de seguros y genera una tabla de cotización comparativa.

Extrae y organiza la siguiente información:
1. Tipo de seguro (Auto, Vida, GMM, RC, etc.)
2. Aseguradora
3. Número de póliza (si existe)
4. Prima/Costo
5. Coberturas principales
6. Deducibles
7. Vigencia
8. Beneficiarios o asegurados

Luego genera recomendaciones de productos similares de otras aseguradoras mexicanas como:
- GNP, MAPFRE, Qualitas, HDI, AXA, Zurich, etc.

Formato de respuesta en JSON:
{
  "documentos_analizados": [...],
  "cotizacion_comparativa": [...],
  "recomendaciones": [...]
}
          `
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate quote');
      }

      const result = await response.json();
      
      try {
        const cotizacionData = JSON.parse(result.analysis);
        setCotizaciones(cotizacionData);
        toast.success('Tabla de cotización generada exitosamente');
      } catch (parseError) {
        // Si no es JSON válido, mostrar como texto
        setCotizaciones({
          analysis: result.analysis,
          isText: true
        });
        toast.success('Análisis generado exitosamente');
      }

    } catch (error) {
      console.error('Error generating quote:', error);
      toast.error('Error al generar tabla de cotización');
    } finally {
      setIsGeneratingTable(false);
    }
  };

  const generateMail = async () => {
    if (extractedTexts.length === 0) {
      toast.error('Primero extrae el texto de los archivos');
      return;
    }

    setIsGeneratingMail(true);

    try {
      const combinedText = extractedTexts.map(et => 
        `Archivo: ${et.fileName}\n${et.text}`
      ).join('\n\n---\n\n');

      const cotizacionText = cotizaciones && !cotizaciones.isText 
        ? JSON.stringify(cotizaciones, null, 2)
        : cotizaciones?.analysis || '';

      const response = await fetch('/api/generate-quote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          documentText: combinedText + '\n\nCotización generada:\n' + cotizacionText,
          prompt: `
Basándote en los documentos de seguros analizados y la cotización generada, crea un correo electrónico profesional dirigido al cliente.

El correo debe incluir:
1. Saludo profesional
2. Resumen de los documentos analizados
3. Principales hallazgos y recomendaciones
4. Tabla comparativa resumida (si aplica)
5. Próximos pasos sugeridos
6. Cierre profesional con datos de contacto

Tono: Profesional, amigable y consultivo
Formato: HTML para correo electrónico
          `
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate mail');
      }

      const result = await response.json();
      setGeneratedMail(result.analysis);
      toast.success('Correo generado exitosamente');

    } catch (error) {
      console.error('Error generating mail:', error);
      toast.error('Error al generar correo');
    } finally {
      setIsGeneratingMail(false);
    }
  };

  return (
    <div className="cotiza-container">
      <div className="cotiza-header">
        <h1>Cotizador de Seguros</h1>
        <p>Sube documentos de seguros para generar cotizaciones comparativas</p>
      </div>

      <div className="cotiza-content">
        {/* Upload Section */}
        <div className="upload-section">
          <div className="upload-area">
            <input
              type="file"
              id="file-upload"
              multiple
              accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
              onChange={handleFileUpload}
              className="file-input"
            />
            <label htmlFor="file-upload" className="upload-label">
              <svg className="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17,8 12,3 7,8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <span>Seleccionar archivos</span>
              <small>PDF, DOC, DOCX, TXT, PNG, JPG (máx. 10MB c/u)</small>
            </label>
          </div>

          <div className="supported-formats">
            <h4>Formatos soportados:</h4>
            <div className="format-tags">
              <span className="format-tag">PDF</span>
              <span className="format-tag">DOC/DOCX</span>
              <span className="format-tag">TXT</span>
              <span className="format-tag">PNG/JPG</span>
            </div>
          </div>
        </div>

        {/* Files List */}
        {files.length > 0 && (
          <div className="files-section">
            <div className="files-header">
              <h3>Archivos cargados ({files.length})</h3>
              {isProcessing && (
                <div className="processing-indicator">
                  <span>Procesando archivos...</span>
                </div>
              )}
            </div>

            <div className="files-list">
              {files.map(file => (
                <div key={file.id} className="file-item">
                  <div className="file-info">
                    <div className="file-name">{file.name}</div>
                    <div className="file-details">
                      <span className="file-type">{file.type}</span>
                      <span className="file-size">{(file.size / 1024).toFixed(1)} KB</span>
                      <span className={`file-status status-${file.status}`}>
                        {file.status === 'pending' && 'Pendiente'}
                        {file.status === 'processing' && 'Procesando...'}
                        {file.status === 'completed' && 'Completado'}
                      </span>
                    </div>
                  </div>

                  <button 
                    className="remove-file"
                    onClick={() => removeFile(file.id)}
                    title="Eliminar archivo"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Extracted Texts */}
        {extractedTexts.length > 0 && (
          <div className="texts-section">
            <div className="texts-header">
              <h3>Texto extraído</h3>
              <div className="texts-actions">
                <button 
                  className="btn-primary"
                  onClick={generateCotizaciones}
                  disabled={isGeneratingTable}
                >
                  {isGeneratingTable ? 'Generando tabla...' : 'Generar tabla'}
                </button>
                <button 
                  className="btn-secondary"
                  onClick={generateMail}
                  disabled={isGeneratingMail}
                >
                  {isGeneratingMail ? 'Generando correo...' : 'Generar correo'}
                </button>
              </div>
            </div>

            <div className="texts-list">
              {extractedTexts.map((textData, index) => (
                <div key={index} className="text-item">
                  <h4>{textData.fileName}</h4>
                  <div className="text-content">
                    {textData.text.substring(0, 500)}
                    {textData.text.length > 500 && '...'}
                  </div>
                  <div className="text-stats">
                    <span>Caracteres: {textData.text.length}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cotización Results */}
        {cotizaciones && Object.keys(cotizaciones).length > 0 && (
          <div className="cotizacion-section">
            <h3>Tabla de cotización generada</h3>
            
            {cotizaciones.isText ? (
              <div className="cotizacion-text">
                <pre>{cotizaciones.analysis}</pre>
              </div>
            ) : (
              <div className="cotizacion-tables">
                {cotizaciones.documentos_analizados && (
                  <div className="table-section">
                    <h4>Documentos analizados</h4>
                    <div className="table-responsive">
                      <table className="cotizacion-table">
                        <thead>
                          <tr>
                            <th>Documento</th>
                            <th>Tipo</th>
                            <th>Aseguradora</th>
                            <th>Prima</th>
                            <th>Coberturas</th>
                          </tr>
                        </thead>
                        <tbody>
                          {cotizaciones.documentos_analizados.map((doc, index) => (
                            <tr key={index}>
                              <td>{doc.documento || 'N/A'}</td>
                              <td>{doc.tipo || 'N/A'}</td>
                              <td>{doc.aseguradora || 'N/A'}</td>
                              <td>{doc.prima || 'N/A'}</td>
                              <td>{doc.coberturas || 'N/A'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {cotizaciones.cotizacion_comparativa && (
                  <div className="table-section">
                    <h4>Cotización comparativa</h4>
                    <div className="table-responsive">
                      <table className="cotizacion-table">
                        <thead>
                          <tr>
                            <th>Aseguradora</th>
                            <th>Producto</th>
                            <th>Prima estimada</th>
                            <th>Coberturas</th>
                            <th>Deducible</th>
                          </tr>
                        </thead>
                        <tbody>
                          {cotizaciones.cotizacion_comparativa.map((cotiz, index) => (
                            <tr key={index}>
                              <td>{cotiz.aseguradora || 'N/A'}</td>
                              <td>{cotiz.producto || 'N/A'}</td>
                              <td>{cotiz.prima || 'N/A'}</td>
                              <td>{cotiz.coberturas || 'N/A'}</td>
                              <td>{cotiz.deducible || 'N/A'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {cotizaciones.recomendaciones && (
                  <div className="recommendations-section">
                    <h4>Recomendaciones</h4>
                    <div className="recommendations-list">
                      {cotizaciones.recomendaciones.map((rec, index) => (
                        <div key={index} className="recommendation-item">
                          <h5>{rec.aseguradora}</h5>
                          <p>{rec.descripcion}</p>
                          {rec.ventajas && (
                            <ul>
                              {rec.ventajas.map((ventaja, vIndex) => (
                                <li key={vIndex}>{ventaja}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Generated Mail */}
        {generatedMail && (
          <div className="mail-section">
            <div className="mail-header">
              <h3>Correo generado</h3>
              <button 
                className="btn-secondary"
                onClick={() => navigator.clipboard.writeText(generatedMail)}
              >
                Copiar correo
              </button>
            </div>
            <div className="mail-content">
              <div dangerouslySetInnerHTML={{ __html: generatedMail }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Cotiza; 