import React, { useState } from 'react';
import './Cotiza.css';
import { toast } from 'react-hot-toast';

const Cotiza = () => {
  const [files, setFiles] = useState([]);
  const [extractedTexts, setExtractedTexts] = useState([]);
  const [cotizaciones, setCotizaciones] = useState(null);
  const [generatedMail, setGeneratedMail] = useState('');
  const [showMailForm, setShowMailForm] = useState(false);
  const [clientData, setClientData] = useState({
    nombre: '',
    email: '',
    telefono: '',
    empresa: ''
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGeneratingTable, setIsGeneratingTable] = useState(false);
  const [isGeneratingMail, setIsGeneratingMail] = useState(false);

  const supportedTypes = {
    'application/pdf': 'PDF',
    'text/plain': 'TXT',
    'application/msword': 'DOC',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
    'image/png': 'PNG',
    'image/jpeg': 'JPEG',
    'image/jpg': 'JPG'
  };

  const handleFileUpload = async (event) => {
    const uploadedFiles = Array.from(event.target.files);
    
    // Verificar límite de 5 archivos
    const currentFileCount = files.length;
    const totalFiles = currentFileCount + uploadedFiles.length;
    
    if (totalFiles > 5) {
      toast.error(`❌ Máximo 5 archivos permitidos. Actualmente tienes ${currentFileCount} archivo(s).`);
      return;
    }
    
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
      toast.success(`📁 ${validFiles.length} archivo(s) agregado(s) (${currentFileCount + validFiles.length}/5)`);
      
      // Solo extraer texto, NO generar automáticamente la tabla
      await extractTextFromFiles(fileObjects);
    }
    
    // Limpiar el input para permitir seleccionar el mismo archivo otra vez
    event.target.value = '';
  };

  const removeFile = (id) => {
    setFiles(prev => prev.filter(f => f.id !== id));
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
        if (extractedTexts.some(et => et.fileId === fileData.id)) {
          console.log('⏭️ Archivo ya procesado:', fileData.name);
          continue;
        }
        
        console.log('🔄 Procesando archivo:', fileData.name);
        
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

        setExtractedTexts(prev => {
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

        setFiles(prev => prev.map(f => 
          f.id === fileData.id ? { ...f, status: 'completed' } : f
        ));
      }

      toast.success('✅ Texto extraído exitosamente. Ahora puedes generar la tabla de cotización.');
      
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
    setIsGeneratingTable(true);

    try {
      const combinedText = extractedTexts.map(et => 
        `Archivo: ${et.fileName}\n${et.text}`
      ).join('\n\n---\n\n');

      const fileNames = extractedTexts.map(et => et.fileName).join(', ');
      const fileCount = extractedTexts.length;

      const dynamicPrompt = `Analiza los siguientes documentos de seguros y genera una tabla de cotización comparativa estilo matriz.

CRÍTICO: Responde SOLAMENTE con un objeto JSON válido y completo. No agregues texto antes o después del JSON. No uses markdown. Solo el JSON puro.

IMPORTANTE: 
- Extrae las aseguradoras REALES de los documentos subidos (${fileNames})
- Identifica automáticamente todas las aseguradoras mencionadas en los documentos
- NO uses aseguradoras hardcodeadas
- Crea las columnas dinámicamente basándote SOLO en las aseguradoras encontradas
- Si encuentras múltiples opciones de la misma aseguradora, créa columnas separadas

FORMATO DE RESPUESTA (adaptado a las aseguradoras encontradas):
{
  "vehiculo": {
    "marca": "[EXTRAER DE DOCUMENTOS]",
    "modelo": "[EXTRAER DE DOCUMENTOS]", 
    "anio": "[EXTRAER DE DOCUMENTOS]",
    "cp": "[EXTRAER DE DOCUMENTOS]"
  },
  "tabla_comparativa": {
    "coberturas": [
      {
        "cobertura": "SUMA ASEGURADA",
        "[ASEGURADORA_1]": "[VALOR_REAL]",
        "[ASEGURADORA_2]": "[VALOR_REAL]"
      },
      {
        "cobertura": "DAÑOS MATERIALES", 
        "[ASEGURADORA_1]": "[VALOR_REAL]",
        "[ASEGURADORA_2]": "[VALOR_REAL]"
      },
      {
        "cobertura": "ROBO TOTAL",
        "[ASEGURADORA_1]": "[VALOR_REAL]",
        "[ASEGURADORA_2]": "[VALOR_REAL]"
      },
      {
        "cobertura": "RESPONSABILIDAD CIVIL",
        "[ASEGURADORA_1]": "[VALOR_REAL]",
        "[ASEGURADORA_2]": "[VALOR_REAL]"
      },
      {
        "cobertura": "GASTOS MÉDICOS OCUPANTES",
        "[ASEGURADORA_1]": "[VALOR_REAL]",
        "[ASEGURADORA_2]": "[VALOR_REAL]"
      },
      {
        "cobertura": "COSTO ANUAL",
        "[ASEGURADORA_1]": "[VALOR_REAL]",
        "[ASEGURADORA_2]": "[VALOR_REAL]"
      }
    ]
  },
  "recomendaciones": [
    {
      "aseguradora": "[NOMBRE_REAL]",
      "razon": "[ANÁLISIS_REAL]",
      "precio": "[PRECIO_REAL]"
    }
  ]
}

Archivos subidos: ${fileCount} documentos
Nombres: ${fileNames}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      const response = await fetch('/api/generate-quote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        signal: controller.signal,
        body: JSON.stringify({
          documentText: combinedText,
          prompt: dynamicPrompt
        })
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error del servidor:', errorText);
        throw new Error(`Error del servidor: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ Resultado recibido:', result);
      
      try {
        let cleanedResponse = result.analysis.trim();
        const firstBrace = cleanedResponse.indexOf('{');
        const lastBrace = cleanedResponse.lastIndexOf('}');
        
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          cleanedResponse = cleanedResponse.substring(firstBrace, lastBrace + 1);
        }
        
        const cotizacionData = JSON.parse(cleanedResponse);
        setCotizaciones(cotizacionData);
        toast.success('Tabla de cotización generada exitosamente');
        
        setTimeout(() => {
          const tablaElement = document.querySelector('.cotizacion-section');
          if (tablaElement) {
            tablaElement.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'start',
              inline: 'nearest'
            });
          }
        }, 500);
      } catch (parseError) {
        console.warn('⚠️ No se pudo parsear JSON:', parseError);
        
        try {
          const jsonMatch = result.analysis.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
          if (jsonMatch) {
            const extractedJson = JSON.parse(jsonMatch[1]);
            setCotizaciones(extractedJson);
            toast.success('Tabla de cotización generada exitosamente');
            
            setTimeout(() => {
              const tablaElement = document.querySelector('.cotizacion-section');
              if (tablaElement) {
                tablaElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }
            }, 500);
            return;
          }
          
          const jsonRegex = /\{[\s\S]*\}/;
          const jsonStringMatch = result.analysis.match(jsonRegex);
          if (jsonStringMatch) {
            const extractedJson = JSON.parse(jsonStringMatch[0]);
            setCotizaciones(extractedJson);
            toast.success('Tabla de cotización generada exitosamente');
            
            setTimeout(() => {
              const tablaElement = document.querySelector('.cotizacion-section');
              if (tablaElement) {
                tablaElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }
            }, 500);
            return;
          }
          
        } catch (secondError) {
          console.error('❌ Segundo intento de parsing falló:', secondError);
        }
        
        setCotizaciones({
          analysis: result.analysis,
          isText: true
        });
        toast.warn('Se generó el análisis pero no se pudo crear la tabla estructurada');
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

  const updateCellValue = (rowIndex, field, value) => {
    const updatedCotizaciones = { ...cotizaciones };
    if (field === 'cobertura') {
      updatedCotizaciones.tabla_comparativa.coberturas[rowIndex].cobertura = value;
    } else {
      updatedCotizaciones.tabla_comparativa.coberturas[rowIndex][field] = value;
    }
    setCotizaciones(updatedCotizaciones);
  };

  const generateMail = async () => {
    if (!cotizaciones || extractedTexts.length === 0) {
      toast.error('Primero genera la tabla de cotización');
      return;
    }

    if (!clientData.nombre || !clientData.email) {
      toast.error('Nombre y email son obligatorios');
      return;
    }

    setIsGeneratingMail(true);
    setShowMailForm(false);

    try {
      // Preparar datos estructurados de la cotización
      let cotizacionData = {};
      
      if (cotizaciones && !cotizaciones.isText) {
        // Extraer información del vehículo
        if (cotizaciones.vehiculo) {
          cotizacionData.vehiculo = {
            marca: cotizaciones.vehiculo.marca || 'N/A',
            modelo: cotizaciones.vehiculo.modelo || 'N/A',
            anio: cotizaciones.vehiculo.anio || 'N/A',
            cp: cotizaciones.vehiculo.cp || 'N/A'
          };
        }

        // Extraer aseguradoras y sus cotizaciones
        if (cotizaciones.tabla_comparativa && cotizaciones.tabla_comparativa.coberturas) {
          const coberturas = cotizaciones.tabla_comparativa.coberturas;
          const aseguradoras = [];
          
          // Identificar todas las aseguradoras
          if (coberturas.length > 0) {
            Object.keys(coberturas[0]).forEach(key => {
              if (key !== 'cobertura') {
                aseguradoras.push(key);
              }
            });
          }

          cotizacionData.aseguradoras = aseguradoras;
          cotizacionData.coberturas = coberturas;

          // Encontrar precios anuales
          const costoRow = coberturas.find(c => 
            c.cobertura && c.cobertura.toLowerCase().includes('costo')
          );
          
          if (costoRow) {
            cotizacionData.precios = {};
            aseguradoras.forEach(aseg => {
              cotizacionData.precios[aseg] = costoRow[aseg] || 'N/A';
            });
          }
        }

        // Extraer recomendaciones si existen
        if (cotizaciones.recomendaciones) {
          cotizacionData.recomendaciones = cotizaciones.recomendaciones;
        }
      }

      // Preparar información de archivos analizados
      const archivosInfo = extractedTexts.map(et => ({
        nombre: et.fileName,
        tamaño: `${Math.round(et.text.length/1000)}k caracteres`
      }));

      const response = await fetch('/api/generate-quote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          documentText: `Información de cotización estructurada: ${JSON.stringify(cotizacionData, null, 2)}`,
          prompt: `
Eres un asesor de seguros profesional. Genera un correo electrónico HTML profesional para enviar al cliente con el análisis de cotización de seguros.

DATOS DEL CLIENTE:
- Nombre: ${clientData.nombre}
- Email: ${clientData.email}
- Teléfono: ${clientData.telefono || 'No proporcionado'}
- Empresa: ${clientData.empresa || 'Particular'}

DATOS DE LA COTIZACIÓN:
- Archivos analizados: ${archivosInfo.map(a => a.nombre).join(', ')}
- Vehículo: ${cotizacionData.vehiculo ? `${cotizacionData.vehiculo.marca} ${cotizacionData.vehiculo.modelo} ${cotizacionData.vehiculo.anio}` : 'Información del vehículo disponible'}
- Aseguradoras cotizadas: ${cotizacionData.aseguradoras ? cotizacionData.aseguradoras.join(', ') : 'Múltiples aseguradoras'}
- Precios disponibles: ${cotizacionData.precios ? 'Sí' : 'Información de precios disponible'}

ESTRUCTURA DEL CORREO:
1. **Encabezado profesional** con logo placeholder y datos de contacto
2. **Saludo personalizado** al cliente
3. **Resumen ejecutivo** del análisis realizado
4. **Tabla comparativa** con las principales coberturas y precios (si están disponibles)
5. **Recomendaciones profesionales** basadas en el análisis
6. **Próximos pasos** sugeridos
7. **Firma profesional** con datos de contacto

REQUISITOS:
- Usar HTML moderno con estilos CSS inline
- Tono profesional pero amigable
- Incluir toda la información de cotización de forma organizada
- Destacar los precios más competitivos
- Mencionar específicamente las aseguradoras analizadas
- Incluir llamadas a la acción claras
- Todo el contenido en ESPAÑOL
- Usar colores corporativos azules (#007bff, #0056b3)
- Tabla responsive y fácil de leer
- Información de contacto: CASIN Seguros, Tel: +52 55 1234-5678, Email: contacto@casin.com.mx

Genera un correo completo y profesional listo para enviar.
          `
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate mail');
      }

      const result = await response.json();
      setGeneratedMail(result.analysis);
      toast.success('📧 Correo profesional generado exitosamente');

    } catch (error) {
      console.error('Error generating mail:', error);
      toast.error('❌ Error al generar correo');
    } finally {
      setIsGeneratingMail(false);
    }
  };

  const sendDirectEmail = async () => {
    if (!generatedMail || !clientData.email) {
      toast.error('❌ No hay correo generado o email del cliente');
      return;
    }

    setIsGeneratingMail(true);
    
    try {
      console.log('📧 Enviando correo directo a:', clientData.email);
      
      const subject = `Propuesta de Seguros - ${clientData.nombre}`;
      
      const response = await fetch('/api/email/send-welcome', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: clientData.email,
          subject: subject,
          htmlContent: generatedMail,
          clientData: clientData,
          cotizaciones: cotizaciones
        }),
      });

      console.log('📧 Response status:', response.status);
      console.log('📧 Response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Server error response:', errorText);
        throw new Error(`Error del servidor (${response.status}): ${errorText}`);
      }

      const result = await response.json();
      console.log('📧 Server response:', result);

      if (result.success) {
        toast.success(`✅ Correo enviado exitosamente a ${clientData.email}`);
        console.log('📧 Email enviado:', result.messageId);
      } else {
        throw new Error(result.error || result.details || 'Error desconocido al enviar correo');
      }

    } catch (error) {
      console.error('❌ Error enviando correo:', error);
      toast.error(`❌ Error al enviar correo: ${error.message}`);
    } finally {
      setIsGeneratingMail(false);
    }
  };

  const downloadPDF = async () => {
    if (!generatedMail || !cotizaciones) {
      toast.error('No hay contenido para generar PDF');
      return;
    }

    try {
      // Preparar contenido para PDF
      const pdfContent = {
        clientData,
        cotizaciones,
        generatedMail,
        vehiculo: cotizaciones.vehiculo,
        tabla: cotizaciones.tabla_comparativa,
        recomendaciones: cotizaciones.recomendaciones
      };

      const response = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(pdfContent)
      });

      if (!response.ok) {
        throw new Error('Error al generar PDF');
      }

      // Descargar el PDF
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Propuesta_Seguros_${clientData.nombre.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('📄 PDF descargado exitosamente');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('❌ Error al generar PDF');
    }
  };

  return (
    <div className="cotiza-container">
      <div className="cotiza-header">
        <h1>Cotizador de Seguros</h1>
        <p>Sube documentos de seguros para generar cotizaciones comparativas</p>
      </div>

      <div className="cotiza-content">
        <div className="upload-section">
          <div className={`upload-area ${files.length >= 5 ? 'upload-disabled' : ''}`}>
            <input
              type="file"
              id="file-upload"
              multiple
              accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
              onChange={handleFileUpload}
              className="file-input"
              disabled={files.length >= 5}
            />
            <label htmlFor="file-upload" className={`upload-label ${files.length >= 5 ? 'label-disabled' : ''}`}>
              <svg className="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17,8 12,3 7,8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <span>{files.length >= 5 ? 'Límite de archivos alcanzado' : 'Seleccionar archivos'}</span>
              <small>
                {files.length >= 5 
                  ? 'Elimina algunos archivos para subir más' 
                  : 'PDF, DOC, DOCX, TXT, PNG, JPG (máx. 10MB c/u)'
                }
              </small>
            </label>
          </div>


        </div>

        {files.length > 0 && (
          <div className="uploaded-files-section">
            <div className="uploaded-files-header">
              <h3>Archivos subidos ({files.length}/5)</h3>
              <button 
                className="btn-outline btn-small"
                onClick={() => {
                  setFiles([]);
                  setExtractedTexts([]);
                  toast.info('🗑️ Todos los archivos eliminados');
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3,6 5,6 21,6"/>
                  <path d="M19,6v14a2,2 0,0,1,-2,2H7a2,2 0,0,1,-2,-2V6m3,0V4a2,2 0,0,1,2,-2h4a2,2 0,0,1,2,2v2"/>
                </svg>
                Limpiar todo
              </button>
            </div>
            <div className="uploaded-files-list">
              {files.map((file) => (
                <div key={file.id} className="uploaded-file-item">
                  <div className="file-info">
                    <svg className="file-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                    </svg>
                    <div className="file-details">
                      <span className="file-name">{file.name}</span>
                      <span className="file-meta">
                        {file.type} • {(file.size / 1024).toFixed(1)}KB
                      </span>
                    </div>
                  </div>
                  <div className="file-status">
                    {file.status === 'pending' && (
                      <span className="status pending">⏳ Pendiente</span>
                    )}
                    {file.status === 'processing' && (
                      <span className="status processing">🔄 Procesando...</span>
                    )}
                    {file.status === 'completed' && (
                      <span className="status completed">✅ Listo</span>
                    )}
                  </div>
                  <button 
                    className="remove-file-btn"
                    onClick={() => removeFile(file.id)}
                    title="Eliminar archivo"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18"/>
                      <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {isProcessing && (
          <div className="processing-section">
            <div className="processing-indicator">
              <span>Procesando archivos...</span>
            </div>
          </div>
        )}

        {extractedTexts.length > 0 && !cotizaciones && !isGeneratingTable && (
          <div className="files-management-section">
            <div className="files-header">
              <h3>Archivos listos para análisis ({extractedTexts.length})</h3>
              <div className="files-actions">
                <button 
                  className="btn-primary btn-large"
                  onClick={generateCotizaciones}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    <line x1="9" y1="9" x2="9" y2="15"/>
                    <line x1="15" y1="9" x2="15" y2="15"/>
                  </svg>
                  Generar tabla de cotización
                </button>
              </div>
            </div>

            <div className="files-grid">
              {extractedTexts.map((textData, index) => (
                <div key={index} className="file-card">
                  <div className="file-header">
                    <div className="file-info">
                      <svg className="file-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                      </svg>
                      <span className="file-name">{textData.fileName}</span>
                    </div>
                    <button 
                      className="remove-file-btn"
                      onClick={() => {
                        setExtractedTexts(prev => prev.filter(et => et.fileId !== textData.fileId));
                        setFiles(prev => prev.filter(f => f.id !== textData.fileId));
                        toast.info(`Archivo ${textData.fileName} eliminado`);
                      }}
                      title="Eliminar archivo"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  </div>
                  <div className="file-stats">
                    <span>{textData.text.length.toLocaleString()} caracteres</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {isGeneratingTable && (
          <div className="generation-section">
            <div className="generation-indicator">
              <div className="generation-spinner"></div>
              <h3>Generando tabla de cotización...</h3>
              <p>Analizando documentos con IA</p>
            </div>
          </div>
        )}

        {cotizaciones && Object.keys(cotizaciones).length > 0 && (
          <div className="cotizacion-section">
            <h3>Tabla de cotización generada</h3>
            
            {cotizaciones.isText ? (
              <div className="cotizacion-text">
                <pre>{cotizaciones.analysis}</pre>
              </div>
            ) : (
              <div className="cotizacion-tables">
                {cotizaciones.vehiculo && (
                  <div className="vehiculo-info">
                    <h4>
                      {cotizaciones.vehiculo.marca} {cotizaciones.vehiculo.modelo} {cotizaciones.vehiculo.anio}
                    </h4>
                    <p>C.P. {cotizaciones.vehiculo.cp} | AMPLIA</p>
                  </div>
                )}

                {/* Botón de generar correo siempre visible cuando hay cotizaciones */}
                {cotizaciones && !cotizaciones.isText && (
                  <div className="mail-button-section">
                    <div className="mail-button-container">
                      <button 
                        className="btn-secondary btn-large"
                        onClick={() => setShowMailForm(true)}
                        disabled={isGeneratingMail}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                          <polyline points="22,6 12,13 2,6"/>
                        </svg>
                        Generar propuesta de correo
                      </button>
                      <button 
                        className="btn-outline"
                        onClick={() => {
                          setFiles([]);
                          setExtractedTexts([]);
                          setCotizaciones(null);
                          setGeneratedMail('');
                          setClientData({ nombre: '', email: '', telefono: '', empresa: '' });
                          toast.info('🔄 Sistema reiniciado completamente');
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3,6 5,6 21,6"/>
                          <path d="M19,6v14a2,2 0,0,1,-2,2H7a2,2 0,0,1,-2,-2V6m3,0V4a2,2 0,0,1,2,-2h4a2,2 0,0,1,2,2v2"/>
                        </svg>
                        Reiniciar sistema
                      </button>
                    </div>
                  </div>
                )}

                {/* Botón de generar correo siempre visible cuando hay cotizaciones */}
                {cotizaciones && !cotizaciones.isText && (
                  <div className="mail-button-section" style={{ 
                    padding: '20px 0', 
                    display: 'flex', 
                    justifyContent: 'center', 
                    gap: '15px' 
                  }}>
                    <button 
                      className="btn-secondary btn-large"
                      onClick={() => setShowMailForm(true)}
                      disabled={isGeneratingMail}
                      style={{
                        padding: '12px 24px',
                        fontSize: '1rem',
                        fontWeight: '600'
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                        <polyline points="22,6 12,13 2,6"/>
                      </svg>
                      Generar propuesta de correo
                    </button>
                    <button 
                      className="btn-outline"
                      onClick={() => {
                        setFiles([]);
                        setExtractedTexts([]);
                        setCotizaciones(null);
                        setGeneratedMail('');
                        setClientData({ nombre: '', email: '', telefono: '', empresa: '' });
                        toast.info('🔄 Sistema reiniciado completamente');
                      }}
                      style={{
                        padding: '12px 24px',
                        fontSize: '1rem'
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3,6 5,6 21,6"/>
                        <path d="M19,6v14a2,2 0,0,1,-2,2H7a2,2 0,0,1,-2,-2V6m3,0V4a2,2 0,0,1,2,-2h4a2,2 0,0,1,2,2v2"/>
                      </svg>
                      Reiniciar sistema
                    </button>
                  </div>
                )}

                {cotizaciones.tabla_comparativa && cotizaciones.tabla_comparativa.coberturas && (() => {
                  const coberturas = cotizaciones.tabla_comparativa.coberturas;
                  const aseguradoras = [];
                  
                  if (coberturas.length > 0) {
                    const primeraFila = coberturas[0];
                    Object.keys(primeraFila).forEach(key => {
                      if (key !== 'cobertura') {
                        aseguradoras.push(key);
                      }
                    });
                  }

                  return (
                    <div className="table-section">
                      <div className="table-responsive">
                        <table className="matriz-table">
                          <thead>
                            <tr>
                              <th className="cobertura-header">COBERTURAS</th>
                              {aseguradoras.map((aseguradora, index) => {
                                let className = "aseguradora-header";
                                if (aseguradora.toUpperCase().includes('GNP')) {
                                  className += " gnp";
                                } else if (aseguradora.toUpperCase().includes('QUALITAS')) {
                                  className += " qualitas";
                                } else if (aseguradora.toUpperCase().includes('HDI')) {
                                  className += " hdi";
                                } else {
                                  className += " other";
                                }
                                
                                return (
                                  <th key={index} className={className}>
                                    {aseguradora.replace(/_/g, ' ')}
                                  </th>
                                );
                              })}
                            </tr>
                          </thead>
                          <tbody>
                            {coberturas.map((fila, index) => (
                              <tr key={index} className={fila.cobertura === 'COSTO ANUAL' ? 'costo-row' : ''}>
                                <td className="cobertura-name">
                                  <input 
                                    type="text" 
                                    value={fila.cobertura} 
                                    onChange={(e) => updateCellValue(index, 'cobertura', e.target.value)}
                                    className="editable-cell cobertura-input"
                                  />
                                </td>
                                {aseguradoras.map((aseguradora, colIndex) => {
                                  let className = "valor";
                                  if (aseguradora.toUpperCase().includes('GNP')) {
                                    className += " gnp";
                                  } else if (aseguradora.toUpperCase().includes('QUALITAS')) {
                                    className += " qualitas";
                                  } else if (aseguradora.toUpperCase().includes('HDI')) {
                                    className += " hdi";
                                  } else {
                                    className += " other";
                                  }
                                  
                                  return (
                                    <td key={colIndex} className={className}>
                                      <input 
                                        type="text" 
                                        value={fila[aseguradora] || ''} 
                                        onChange={(e) => updateCellValue(index, aseguradora, e.target.value)}
                                        className="editable-cell valor-input"
                                        placeholder="N/A"
                                      />
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="table-actions">
                        <button 
                          className="btn-secondary"
                          onClick={() => setShowMailForm(true)}
                          disabled={isGeneratingMail}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                            <polyline points="22,6 12,13 2,6"/>
                          </svg>
                          Generar propuesta de correo
                        </button>
                        <button 
                          className="btn-outline"
                          onClick={() => navigator.clipboard.writeText(JSON.stringify(cotizaciones, null, 2))}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                          </svg>
                          Copiar datos
                        </button>
                        <button 
                          className="btn-outline"
                          onClick={() => {
                            setFiles([]);
                            setExtractedTexts([]);
                            setCotizaciones(null);
                            setGeneratedMail('');
                            toast.info('🔄 Sistema reiniciado completamente');
                          }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3,6 5,6 21,6"/>
                            <path d="M19,6v14a2,2 0,0,1,-2,2H7a2,2 0,0,1,-2,-2V6m3,0V4a2,2 0,0,1,2,-2h4a2,2 0,0,1,2,2v2"/>
                          </svg>
                          Reiniciar
                        </button>
                      </div>
                    </div>
                  );
                })()}

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
              </div>
            )}


          </div>
        )}

        {showMailForm && (
          <div className="mail-form-overlay">
            <div className="mail-form-modal">
              <div className="mail-form-header">
                <h3>Datos del Cliente para Propuesta</h3>
                <button 
                  className="close-form-btn"
                  onClick={() => setShowMailForm(false)}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
              
              <form className="client-form" onSubmit={(e) => e.preventDefault()}>
                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="nombre">Nombre completo *</label>
                    <input
                      type="text"
                      id="nombre"
                      value={clientData.nombre}
                      onChange={(e) => setClientData(prev => ({...prev, nombre: e.target.value}))}
                      placeholder="Ej: Juan Pérez González"
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="email">Correo electrónico *</label>
                    <input
                      type="email"
                      id="email"
                      value={clientData.email}
                      onChange={(e) => setClientData(prev => ({...prev, email: e.target.value}))}
                      placeholder="Ej: juan.perez@email.com"
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="telefono">Teléfono</label>
                    <input
                      type="tel"
                      id="telefono"
                      value={clientData.telefono}
                      onChange={(e) => setClientData(prev => ({...prev, telefono: e.target.value}))}
                      placeholder="Ej: +52 55 1234-5678"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="empresa">Empresa/Organización</label>
                    <input
                      type="text"
                      id="empresa"
                      value={clientData.empresa}
                      onChange={(e) => setClientData(prev => ({...prev, empresa: e.target.value}))}
                      placeholder="Ej: Empresa ABC S.A. de C.V."
                    />
                  </div>
                </div>
                
                <div className="form-actions">
                  <button 
                    type="button"
                    className="btn-outline"
                    onClick={() => setShowMailForm(false)}
                  >
                    Cancelar
                  </button>
                  <button 
                    type="button"
                    className="btn-primary"
                    onClick={generateMail}
                    disabled={!clientData.nombre || !clientData.email || isGeneratingMail}
                  >
                    {isGeneratingMail ? (
                      <>
                        <span className="button-spinner"></span>
                        Generando propuesta...
                      </>
                    ) : (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                          <polyline points="22,6 12,13 2,6"/>
                        </svg>
                        Generar propuesta
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {generatedMail && (
          <div className="mail-section">
            <div className="mail-header">
              <div className="mail-title">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
                <h3>Correo Profesional Generado</h3>
              </div>
              <div className="mail-actions">
                <button 
                  className="btn-outline"
                  onClick={() => {
                    navigator.clipboard.writeText(generatedMail);
                    toast.success('📋 Correo HTML copiado al portapapeles');
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                  </svg>
                  Copiar HTML
                </button>
                <button 
                  className="btn-secondary"
                  onClick={() => {
                    const plainText = generatedMail.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ');
                    navigator.clipboard.writeText(plainText);
                    toast.success('📝 Texto plano copiado al portapapeles');
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14,2 14,8 20,8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                    <polyline points="10,9 9,9 8,9"/>
                  </svg>
                  Copiar texto
                </button>
                <button 
                  className="btn-primary"
                  onClick={() => downloadPDF()}
                  title="Descargar propuesta como PDF"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14,2 14,8 20,8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                    <polyline points="10,9 9,9 8,9"/>
                  </svg>
                  Descargar PDF
                </button>
                <button 
                  className="btn-primary"
                  onClick={sendDirectEmail}
                  disabled={isGeneratingMail}
                  title="Enviar correo directamente desde el servidor"
                >
                  {isGeneratingMail ? (
                    <>
                      <span className="button-spinner"></span>
                      Enviando...
                    </>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                        <polyline points="22,6 12,13 2,6"/>
                        <path d="m4 4 7 4 7-4"/>
                        <circle cx="18" cy="6" r="2" fill="currentColor"/>
                      </svg>
                      Enviar directamente
                    </>
                  )}
                </button>
                <button 
                  className="btn-secondary"
                  onClick={() => {
                    const subject = `Propuesta de Seguros - ${clientData.nombre}`;
                    const body = generatedMail.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ');
                    const mailtoLink = `mailto:${clientData.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                    window.open(mailtoLink, '_blank');
                  }}
                  title="Abrir en tu cliente de correo local"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                  Abrir en correo local
                </button>
              </div>
            </div>
            
            <div className="client-info-summary">
              <div className="client-summary-header">
                <h4>📋 Resumen de la propuesta</h4>
              </div>
              <div className="client-summary-grid">
                <div className="summary-item">
                  <span className="summary-label">Cliente:</span>
                  <span className="summary-value">{clientData.nombre}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Email:</span>
                  <span className="summary-value">{clientData.email}</span>
                </div>
                {clientData.telefono && (
                  <div className="summary-item">
                    <span className="summary-label">Teléfono:</span>
                    <span className="summary-value">{clientData.telefono}</span>
                  </div>
                )}
                {clientData.empresa && (
                  <div className="summary-item">
                    <span className="summary-label">Empresa:</span>
                    <span className="summary-value">{clientData.empresa}</span>
                  </div>
                )}
                {cotizaciones.vehiculo && (
                  <div className="summary-item">
                    <span className="summary-label">Vehículo:</span>
                    <span className="summary-value">
                      {cotizaciones.vehiculo.marca} {cotizaciones.vehiculo.modelo} {cotizaciones.vehiculo.anio}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="mail-preview">
              <div className="mail-preview-header">
                <h4>📧 Vista previa del correo:</h4>
                <span className="mail-preview-info">Se verá así en el cliente de correo del cliente</span>
              </div>
              <div className="mail-content">
                <div dangerouslySetInnerHTML={{ __html: generatedMail }} />
              </div>
            </div>

            <div className="mail-code-section">
              <details>
                <summary>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="16,18 22,12 16,6"/>
                    <polyline points="8,6 2,12 8,18"/>
                  </svg>
                  Ver código HTML del correo
                </summary>
                <div className="mail-code">
                  <pre><code>{generatedMail}</code></pre>
                </div>
              </details>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Cotiza; 