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

    try {
      for (const fileData of filesToProcess) {
        // Skip if already processed
        if (extractedTexts.some(et => et.fileId === fileData.id)) {
          console.log('⏭️ Archivo ya procesado:', fileData.name);
          continue;
        }
        
        console.log('🔄 Procesando archivo:', fileData.name);
        
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

        // Actualizar el estado usando función para evitar duplicados
        setExtractedTexts(prev => {
          // Verificar si ya existe este archivo
          const exists = prev.some(et => et.fileId === fileData.id);
          if (exists) {
            console.log('⚠️ Evitando duplicado:', fileData.name);
            return prev;
          }
          
          const newText = {
            fileId: fileData.id,
            fileName: fileData.name,
            text: extractedText
          };
          
          console.log('✅ Agregando texto extraído:', fileData.name);
          return [...prev, newText];
        });

        // Actualizar status
        setFiles(prev => prev.map(f => 
          f.id === fileData.id ? { ...f, status: 'completed' } : f
        ));
      }

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
      console.log('📄 Enviando PDF para parsing:', file.name);
      
      const response = await fetch('/api/parse-pdf', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to parse PDF`);
      }

      const result = await response.json();
      console.log('✅ PDF parseado:', file.name, 'Páginas:', result.pages, 'Caracteres:', result.text?.length);
      
      if (result.warning) {
        console.warn('⚠️ Warning:', result.warning);
        toast.warn(`PDF ${file.name}: ${result.warning}`);
      }
      
      return result.text || `Error: No se pudo extraer texto del PDF ${file.name}`;
    } catch (error) {
      console.error('❌ PDF parsing error:', error);
      toast.error(`Error al procesar PDF ${file.name}: ${error.message}`);
      return `Error al procesar PDF ${file.name}: ${error.message}`;
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

    console.log('🚀 Iniciando generación de cotización...');
    console.log('📄 Textos extraídos:', extractedTexts);
    
    setIsGeneratingTable(true);

    try {
      const combinedText = extractedTexts.map(et => 
        `Archivo: ${et.fileName}\n${et.text}`
      ).join('\n\n---\n\n');

      console.log('📋 Texto combinado enviado:', combinedText.substring(0, 200) + '...');

      // Crear un controlador de abort para timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 segundos

      const response = await fetch('/api/generate-quote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        signal: controller.signal,
        body: JSON.stringify({
          documentText: combinedText,
          prompt: `
Analiza los siguientes documentos de seguros y genera una tabla de cotización comparativa estilo matriz.

IMPORTANTE: Responde únicamente con un JSON válido, sin texto adicional.

Crea una tabla comparativa como matriz con las siguientes columnas por aseguradora:
- Múltiples opciones de la misma aseguradora (ej: GNP, GNP 2)
- Diferentes aseguradoras mexicanas (GNP, QUALITAS, HDI, MAPFRE, AXA, ZURICH)

Formato de respuesta (JSON únicamente):
{
  "vehiculo": {
    "marca": "INFINITI",
    "modelo": "QX60",
    "anio": "2017",
    "cp": "06500"
  },
  "tabla_comparativa": {
    "coberturas": [
      {
        "cobertura": "SUMA ASEGURADA",
        "GNP": "$344,850",
        "GNP_2": "$344,850", 
        "QUALITAS": "$369,700",
        "QUALITAS_2": "$369,700",
        "HDI": "$390,000",
        "HDI_2": "$390,000"
      },
      {
        "cobertura": "DAÑOS MATERIALES",
        "GNP": "5%",
        "GNP_2": "5%",
        "QUALITAS": "5%", 
        "QUALITAS_2": "5%",
        "HDI": "5%",
        "HDI_2": "5%"
      },
      {
        "cobertura": "ROBO TOTAL",
        "GNP": "10%",
        "GNP_2": "10%",
        "QUALITAS": "10%",
        "QUALITAS_2": "10%", 
        "HDI": "10%",
        "HDI_2": "10%"
      },
      {
        "cobertura": "RESPONSABILIDAD CIVIL",
        "GNP": "$3,000,000",
        "GNP_2": "$3,000,000",
        "QUALITAS": "$3,000,000",
        "QUALITAS_2": "$3,000,000",
        "HDI": "$3,000,000",
        "HDI_2": "$3,000,000"
      },
      {
        "cobertura": "RC FALLECIMIENTO",
        "GNP": "$3,000,000",
        "GNP_2": "$3,000,000",
        "QUALITAS": "$3,000,000",
        "QUALITAS_2": "$3,000,000",
        "HDI": "$3,000,000",
        "HDI_2": "$3,000,000"
      },
      {
        "cobertura": "GASTOS MÉDICOS OCUPANTES",
        "GNP": "$500,000",
        "GNP_2": "$500,000",
        "QUALITAS": "$500,000",
        "QUALITAS_2": "$500,000",
        "HDI": "$525,000",
        "HDI_2": "$525,000"
      },
      {
        "cobertura": "COSTO ANUAL",
        "GNP": "$23,063.00",
        "GNP_2": "$27,117.00",
        "QUALITAS": "$13,246.48",
        "QUALITAS_2": "$17,714.77",
        "HDI": "$14,333.52",
        "HDI_2": "$17,997.96"
      }
    ]
  },
  "recomendaciones": [
    {
      "aseguradora": "QUALITAS",
      "razon": "Mejor precio en opción básica",
      "precio": "$13,246.48"
    },
    {
      "aseguradora": "HDI", 
      "razon": "Mejor cobertura en gastos médicos",
      "precio": "$14,333.52"
    }
  ]
}
          `
        })
      });

      clearTimeout(timeoutId);

      console.log('📡 Respuesta del servidor:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error del servidor:', errorText);
        throw new Error(`Error del servidor: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ Resultado recibido:', result);
      
      try {
        const cotizacionData = JSON.parse(result.analysis);
        console.log('📊 Datos de cotización parseados:', cotizacionData);
        setCotizaciones(cotizacionData);
        toast.success('Tabla de cotización generada exitosamente');
      } catch (parseError) {
        console.warn('⚠️ No se pudo parsear JSON, mostrando como texto:', parseError);
        // Si no es JSON válido, mostrar como texto
        setCotizaciones({
          analysis: result.analysis,
          isText: true
        });
        toast.success('Análisis generado exitosamente');
      }

    } catch (error) {
      console.error('❌ Error completo:', error);
      
      if (error.name === 'AbortError') {
        toast.error('⏱️ La generación de tabla tardó demasiado (timeout)');
      } else if (error.message.includes('Failed to fetch')) {
        toast.error('🔌 Error de conexión con el servidor');
      } else {
        toast.error(`❌ Error al generar tabla: ${error.message}`);
      }
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

        {/* Processing Indicator */}
        {isProcessing && (
          <div className="processing-section">
            <div className="processing-indicator">
              <span>Procesando archivos...</span>
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
                  {isGeneratingTable ? (
                    <>
                      <span className="button-spinner"></span>
                      Generando tabla...
                    </>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                        <line x1="9" y1="9" x2="9" y2="15"/>
                        <line x1="15" y1="9" x2="15" y2="15"/>
                      </svg>
                      Generar tabla
                    </>
                  )}
                </button>
                <button 
                  className="btn-secondary"
                  onClick={generateMail}
                  disabled={isGeneratingMail}
                >
                  {isGeneratingMail ? (
                    <>
                      <span className="button-spinner"></span>
                      Generando correo...
                    </>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                        <polyline points="22,6 12,13 2,6"/>
                      </svg>
                      Generar correo
                    </>
                  )}
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
                {/* Información del vehículo */}
                {cotizaciones.vehiculo && (
                  <div className="vehiculo-info">
                    <h4>
                      {cotizaciones.vehiculo.marca} {cotizaciones.vehiculo.modelo} {cotizaciones.vehiculo.anio}
                    </h4>
                    <p>C.P. {cotizaciones.vehiculo.cp} | AMPLIA</p>
                  </div>
                )}

                {/* Tabla comparativa tipo matriz */}
                {cotizaciones.tabla_comparativa && cotizaciones.tabla_comparativa.coberturas && (
                  <div className="table-section">
                    <div className="table-responsive">
                      <table className="matriz-table">
                        <thead>
                          <tr>
                            <th className="cobertura-header">COBERTURAS</th>
                            <th className="aseguradora-header gnp">GNP</th>
                            <th className="aseguradora-header gnp">GNP 2</th>
                            <th className="aseguradora-header qualitas">QUALITAS</th>
                            <th className="aseguradora-header qualitas">QUALITAS 2</th>
                            <th className="aseguradora-header hdi">HDI</th>
                            <th className="aseguradora-header hdi">HDI 2</th>
                          </tr>
                        </thead>
                        <tbody>
                          {cotizaciones.tabla_comparativa.coberturas.map((fila, index) => (
                            <tr key={index} className={fila.cobertura === 'COSTO ANUAL' ? 'costo-row' : ''}>
                              <td className="cobertura-name">{fila.cobertura}</td>
                              <td className="valor gnp">{fila.GNP || 'N/A'}</td>
                              <td className="valor gnp">{fila.GNP_2 || 'N/A'}</td>
                              <td className="valor qualitas">{fila.QUALITAS || 'N/A'}</td>
                              <td className="valor qualitas">{fila.QUALITAS_2 || 'N/A'}</td>
                              <td className="valor hdi">{fila.HDI || 'N/A'}</td>
                              <td className="valor hdi">{fila.HDI_2 || 'N/A'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Recomendaciones */}
                {cotizaciones.recomendaciones && (
                  <div className="recommendations-section">
                    <h4>Recomendaciones</h4>
                    <div className="recommendations-list">
                      {cotizaciones.recomendaciones.map((rec, index) => (
                        <div key={index} className="recommendation-item">
                          <h5>{rec.aseguradora}</h5>
                          <p>{rec.razon}</p>
                          <span className="precio-destacado">{rec.precio}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Fallback para formato anterior */}
                {(cotizaciones.documentos_analizados || cotizaciones.cotizacion_comparativa) && !cotizaciones.tabla_comparativa && (
                  <div className="fallback-tables">
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