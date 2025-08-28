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
  const [selectedSender, setSelectedSender] = useState('casin');
  const [sendBccToSender, setSendBccToSender] = useState(true); // BCC al remitente por defecto
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGeneratingTable, setIsGeneratingTable] = useState(false);
  const [isGeneratingMail, setIsGeneratingMail] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('');

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
    try {
      console.log('📄 Parseando PDF con PDF.js:', file.name);
      
      // Importar pdfService dinámicamente para evitar SSR issues
      const pdfService = (await import('../../services/pdfService.js')).default;
      
      const result = await pdfService.parsePDF(file);
      console.log('✅ PDF parseado:', file.name, 'Páginas:', result.pages, 'Caracteres:', result.text?.length);
      
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
    setLoadingProgress(0);
    setLoadingMessage('Iniciando generación de correo...');

    // Scroll inmediato a la animación de carga
    setTimeout(() => {
      const loadingElement = document.querySelector('.mail-generation-loading');
      if (loadingElement) {
        loadingElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center',
          inline: 'nearest'
        });
      }
    }, 100);

    // Simular progreso con mensajes informativos
    const progressSteps = [
      { progress: 20, message: 'Analizando datos del cliente...' },
      { progress: 40, message: 'Procesando cotizaciones...' },
      { progress: 60, message: 'Generando contenido con IA...' },
      { progress: 80, message: 'Formateando correo profesional...' },
      { progress: 95, message: 'Finalizando detalles...' }
    ];

    let currentStep = 0;
    const progressInterval = setInterval(() => {
      if (currentStep < progressSteps.length) {
        setLoadingProgress(progressSteps[currentStep].progress);
        setLoadingMessage(progressSteps[currentStep].message);
        currentStep++;
      }
    }, 800);

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
1. **Encabezado profesional** con título CASIN Seguros (SIN LOGO)
2. **Saludo personalizado** al cliente
3. **Resumen ejecutivo** del análisis realizado
4. **Tabla comparativa** con las principales coberturas y precios (si están disponibles)
5. **Recomendaciones profesionales** basadas en el análisis
6. **Próximos pasos** sugeridos
7. **Firma profesional** con datos de contacto

REQUISITOS:
- Usar HTML moderno con estilos CSS inline
- NO INCLUIR IMÁGENES ni logos - solo texto y estilos
- Tono profesional pero amigable
- Incluir toda la información de cotización de forma organizada
- Destacar los precios más competitivos
- Mencionar específicamente las aseguradoras analizadas
- Incluir llamadas a la acción claras
- Todo el contenido en ESPAÑOL
- Usar colores corporativos azules (#007bff, #0056b3)
- Tabla responsive y fácil de leer
- Información de contacto: CASIN Seguros, Tel: [Tu número de teléfono], Email: contacto@casin.com.mx

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
      clearInterval(progressInterval);
      console.error('Error generating mail:', error);
      toast.error('❌ Error al generar correo');
    } finally {
      clearInterval(progressInterval);
      setLoadingProgress(100);
      setLoadingMessage('¡Correo generado!');
      setTimeout(() => {
        setIsGeneratingMail(false);
        setLoadingProgress(0);
        setLoadingMessage('');
        
        // Scroll al correo generado después de ocultar la animación
        setTimeout(() => {
          const mailElement = document.querySelector('.mail-section');
          if (mailElement) {
            mailElement.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'start',
              inline: 'nearest'
            });
          }
        }, 300);
      }, 500);
    }
  };

  // Función para obtener configuración del remitente
  const getSenderConfig = (sender) => {
    const senderConfigs = {
      casin: {
        email: import.meta.env.VITE_SMTP_USER_CASIN || 'casinseguros@gmail.com',
        name: 'CASIN Seguros',
        password: import.meta.env.VITE_SMTP_PASS_CASIN
      },
      lore: {
        email: import.meta.env.VITE_SMTP_USER_LORE || 'lorenacasin5@gmail.com',
        name: 'Lore Seguros',
        password: import.meta.env.VITE_SMTP_PASS_LORE
      },
      mich: {
        email: import.meta.env.VITE_SMTP_USER_MICH || 'michelldiaz.casinseguros@gmail.com',
        name: 'Mich Seguros',
        password: import.meta.env.VITE_SMTP_PASS_MICH
      }
    };
    
    return senderConfigs[sender] || senderConfigs.casin;
  };

  const sendDirectEmail = async () => {
    if (!generatedMail || !clientData.email) {
      toast.error('❌ No hay correo generado o email del cliente');
      return;
    }

    setIsGeneratingMail(true);
    
    try {
      console.log('📧 Enviando correo directo a:', clientData.email);
      console.log('📧 Usando remitente:', selectedSender);
      
      // Configurar remitente según la selección
      const senderConfig = getSenderConfig(selectedSender);
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
          cotizaciones: cotizaciones,
          from: senderConfig.email,
          fromName: senderConfig.name,
          fromPass: senderConfig.password,
          sendBccToSender: sendBccToSender
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
        const successMessage = result.bccSent 
          ? `✅ Correo enviado exitosamente a ${clientData.email} (Copia BCC enviada al remitente)`
          : `✅ Correo enviado exitosamente a ${clientData.email}`;
        toast.success(successMessage);
        console.log('📧 Email enviado:', result.messageId);
        if (result.bccSent) {
          console.log('📧 Copia BCC enviada a:', result.bccSent);
        }
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

  const downloadTableAsCSV = () => {
    if (!cotizaciones || !cotizaciones.tabla_comparativa) {
      toast.error('No hay tabla de cotización para exportar');
      return;
    }

    try {
      const coberturas = cotizaciones.tabla_comparativa.coberturas;
      const aseguradoras = [];
      
      // Obtener nombres de aseguradoras
      if (coberturas.length > 0) {
        Object.keys(coberturas[0]).forEach(key => {
          if (key !== 'cobertura') {
            aseguradoras.push(key);
          }
        });
      }

      // Crear encabezados CSV
      let csvContent = 'COBERTURA,' + aseguradoras.join(',') + '\n';
      
      // Agregar filas de datos
      coberturas.forEach(fila => {
        let row = `"${fila.cobertura || ''}"`;
        aseguradoras.forEach(aseg => {
          row += `,"${fila[aseg] || 'N/A'}"`;
        });
        csvContent += row + '\n';
      });

      // Agregar información del vehículo al final
      if (cotizaciones.vehiculo) {
        csvContent += '\n\n"INFORMACIÓN DEL VEHÍCULO"\n';
        csvContent += `"Marca","${cotizaciones.vehiculo.marca || 'N/A'}"\n`;
        csvContent += `"Modelo","${cotizaciones.vehiculo.modelo || 'N/A'}"\n`;
        csvContent += `"Año","${cotizaciones.vehiculo.anio || 'N/A'}"\n`;
        csvContent += `"C.P.","${cotizaciones.vehiculo.cp || 'N/A'}"\n`;
      }

      // Crear y descargar archivo
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Cotizacion_Seguros_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('📊 Tabla exportada como CSV');
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast.error('❌ Error al exportar CSV');
    }
  };

  const downloadTableAsXLS = () => {
    if (!cotizaciones || !cotizaciones.tabla_comparativa) {
      toast.error('No hay tabla de cotización para exportar');
      return;
    }

    try {
      const coberturas = cotizaciones.tabla_comparativa.coberturas;
      const aseguradoras = [];
      
      // Obtener nombres de aseguradoras
      if (coberturas.length > 0) {
        Object.keys(coberturas[0]).forEach(key => {
          if (key !== 'cobertura') {
            aseguradoras.push(key);
          }
        });
      }

      // Crear contenido Excel válido con estructura XML
      let xmlContent = `<?xml version="1.0"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="HeaderStyle">
   <Interior ss:Color="#4a5568" ss:Pattern="Solid"/>
   <Font ss:Bold="1" ss:Color="#ffffff"/>
   <Alignment ss:Horizontal="Center"/>
  </Style>
  <Style ss:ID="GNPStyle">
   <Interior ss:Color="#2563eb" ss:Pattern="Solid"/>
   <Font ss:Bold="1" ss:Color="#ffffff"/>
   <Alignment ss:Horizontal="Center"/>
  </Style>
  <Style ss:ID="QualitasStyle">
   <Interior ss:Color="#dc2626" ss:Pattern="Solid"/>
   <Font ss:Bold="1" ss:Color="#ffffff"/>
   <Alignment ss:Horizontal="Center"/>
  </Style>
  <Style ss:ID="HDIStyle">
   <Interior ss:Color="#16a34a" ss:Pattern="Solid"/>
   <Font ss:Bold="1" ss:Color="#ffffff"/>
   <Alignment ss:Horizontal="Center"/>
  </Style>
  <Style ss:ID="OtherStyle">
   <Interior ss:Color="#6b7280" ss:Pattern="Solid"/>
   <Font ss:Bold="1" ss:Color="#ffffff"/>
   <Alignment ss:Horizontal="Center"/>
  </Style>
  <Style ss:ID="CoberturaStyle">
   <Interior ss:Color="#e2e8f0" ss:Pattern="Solid"/>
   <Font ss:Bold="1"/>
  </Style>
  <Style ss:ID="CostoStyle">
   <Interior ss:Color="#fff3cd" ss:Pattern="Solid"/>
   <Font ss:Bold="1"/>
   <Alignment ss:Horizontal="Center"/>
  </Style>
  <Style ss:ID="VehiculoHeaderStyle">
   <Interior ss:Color="#2c3e50" ss:Pattern="Solid"/>
   <Font ss:Bold="1" ss:Color="#ffffff"/>
   <Alignment ss:Horizontal="Center"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="Cotización de Seguros">
  <Table>`;

      let rowIndex = 1;

      // Título principal
      xmlContent += `
   <Row ss:Index="${rowIndex}">
    <Cell ss:MergeAcross="${aseguradoras.length}" ss:StyleID="VehiculoHeaderStyle">
     <Data ss:Type="String">COTIZACIÓN DE SEGUROS AUTOMÓVILES - ${new Date().toLocaleDateString('es-MX')}</Data>
    </Cell>
   </Row>`;
      rowIndex++;

      // Espacio
      xmlContent += `<Row ss:Index="${rowIndex}"></Row>`;
      rowIndex++;

      // Información del vehículo
      if (cotizaciones.vehiculo) {
        xmlContent += `
   <Row ss:Index="${rowIndex}">
    <Cell ss:MergeAcross="${aseguradoras.length}" ss:StyleID="VehiculoHeaderStyle">
     <Data ss:Type="String">INFORMACIÓN DEL VEHÍCULO</Data>
    </Cell>
   </Row>`;
        rowIndex++;

        const vehiculoData = [
          ['Marca', cotizaciones.vehiculo.marca || 'N/A'],
          ['Modelo', cotizaciones.vehiculo.modelo || 'N/A'],
          ['Año', cotizaciones.vehiculo.anio || 'N/A'],
          ['C.P.', cotizaciones.vehiculo.cp || 'N/A']
        ];

        vehiculoData.forEach(([label, value]) => {
          xmlContent += `
   <Row ss:Index="${rowIndex}">
    <Cell ss:StyleID="CoberturaStyle">
     <Data ss:Type="String">${label}</Data>
    </Cell>
    <Cell ss:MergeAcross="${aseguradoras.length - 1}">
     <Data ss:Type="String">${value}</Data>
    </Cell>
   </Row>`;
          rowIndex++;
        });

        // Espacio
        xmlContent += `<Row ss:Index="${rowIndex}"></Row>`;
        rowIndex++;
      }

      // Encabezados de la tabla de cotización
      xmlContent += `
   <Row ss:Index="${rowIndex}">
    <Cell ss:StyleID="HeaderStyle">
     <Data ss:Type="String">COBERTURAS</Data>
    </Cell>`;

      aseguradoras.forEach(aseg => {
        let styleID = 'OtherStyle';
        if (aseg.toUpperCase().includes('GNP')) styleID = 'GNPStyle';
        else if (aseg.toUpperCase().includes('QUALITAS')) styleID = 'QualitasStyle';
        else if (aseg.toUpperCase().includes('HDI')) styleID = 'HDIStyle';

        xmlContent += `
    <Cell ss:StyleID="${styleID}">
     <Data ss:Type="String">${aseg.replace(/_/g, ' ').toUpperCase()}</Data>
    </Cell>`;
      });

      xmlContent += `
   </Row>`;
      rowIndex++;

      // Filas de datos
      coberturas.forEach(fila => {
        const isCostoRow = fila.cobertura && fila.cobertura.toLowerCase().includes('costo');
        
        xmlContent += `
   <Row ss:Index="${rowIndex}">
    <Cell ss:StyleID="${isCostoRow ? 'CostoStyle' : 'CoberturaStyle'}">
     <Data ss:Type="String">${fila.cobertura || 'N/A'}</Data>
    </Cell>`;

        aseguradoras.forEach(aseg => {
          const value = fila[aseg] || 'N/A';
          const isNumeric = !isNaN(value.replace(/[,$]/g, '')) && value !== 'N/A';
          
          xmlContent += `
    <Cell${isCostoRow ? ' ss:StyleID="CostoStyle"' : ''}>
     <Data ss:Type="${isNumeric ? 'Number' : 'String'}">${isNumeric ? value.replace(/[,$]/g, '') : value}</Data>
    </Cell>`;
        });

        xmlContent += `
   </Row>`;
        rowIndex++;
      });

      // Pie de página
      xmlContent += `
   <Row ss:Index="${rowIndex + 1}">
    <Cell ss:MergeAcross="${aseguradoras.length}">
     <Data ss:Type="String">Documento generado automáticamente por CASIN - Sistema de Cotización</Data>
    </Cell>
   </Row>`;

      xmlContent += `
  </Table>
 </Worksheet>
</Workbook>`;

      // Crear archivo Excel
      const blob = new Blob([xmlContent], { 
        type: 'application/vnd.ms-excel;charset=utf-8;' 
      });
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Cotizacion_Seguros_${new Date().toISOString().split('T')[0]}.xls`;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      
      // Limpiar después de un momento
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }, 1000);
      
      toast.success('📈 Tabla exportada como Excel (.xls)');
    } catch (error) {
      console.error('Error exporting XLS:', error);
      toast.error('❌ Error al exportar Excel: ' + error.message);
    }
  };

  const downloadTableAsPDF = () => {
    if (!cotizaciones || !cotizaciones.tabla_comparativa) {
      toast.error('No hay tabla de cotización para exportar');
      return;
    }

    try {
      // Usar jsPDF para generar PDF real en el frontend
      const { jsPDF } = window.jspdf;
      
      if (!jsPDF) {
        // Si jsPDF no está disponible, usar html2pdf como alternativa
        if (window.html2pdf) {
          generatePDFWithHtml2pdf();
        } else {
          // Fallback simple: generar CSV con extensión .pdf (no ideal pero funcional)
          generateCSVAsPDF();
        }
        return;
      }

      const coberturas = cotizaciones.tabla_comparativa.coberturas;
      const aseguradoras = [];
      
      // Obtener nombres de aseguradoras
      if (coberturas.length > 0) {
        Object.keys(coberturas[0]).forEach(key => {
          if (key !== 'cobertura') {
            aseguradoras.push(key);
          }
        });
      }

      // Crear documento PDF
      const doc = new jsPDF('landscape', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let yPosition = 20;

      // Título
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('COTIZACIÓN DE SEGUROS AUTOMÓVILES', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 10;

      // Fecha
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`Fecha: ${new Date().toLocaleDateString('es-MX')}`, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 15;

      // Información del vehículo
      if (cotizaciones.vehiculo) {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('INFORMACIÓN DEL VEHÍCULO', 20, yPosition);
        yPosition += 8;

        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        const vehiculoText = `${cotizaciones.vehiculo.marca || 'N/A'} ${cotizaciones.vehiculo.modelo || 'N/A'} ${cotizaciones.vehiculo.anio || 'N/A'}`;
        doc.text(vehiculoText, 20, yPosition);
        yPosition += 6;
        doc.text(`C.P. ${cotizaciones.vehiculo.cp || 'N/A'} | COBERTURA AMPLIA`, 20, yPosition);
        yPosition += 15;
      }

      // Crear tabla
      const tableData = [];
      
      // Headers
      const headers = ['COBERTURAS', ...aseguradoras.map(aseg => aseg.replace(/_/g, ' ').toUpperCase())];
      tableData.push(headers);

      // Datos
      coberturas.forEach(fila => {
        const row = [fila.cobertura || 'N/A'];
        aseguradoras.forEach(aseg => {
          row.push(fila[aseg] || 'N/A');
        });
        tableData.push(row);
      });

      // Usar autoTable plugin si está disponible
      if (doc.autoTable) {
        doc.autoTable({
          head: [headers],
          body: tableData.slice(1),
          startY: yPosition,
          theme: 'grid',
          headStyles: {
            fillColor: [74, 85, 104],
            textColor: 255,
            fontStyle: 'bold'
          },
          bodyStyles: {
            fontSize: 10
          },
          columnStyles: {
            0: { fontStyle: 'bold', fillColor: [226, 232, 240] }
          },
          didParseCell: function(data) {
            // Colorear headers de aseguradoras
            if (data.section === 'head' && data.column.index > 0) {
              const aseguradora = headers[data.column.index].toUpperCase();
              if (aseguradora.includes('GNP')) {
                data.cell.styles.fillColor = [37, 99, 235];
              } else if (aseguradora.includes('QUALITAS')) {
                data.cell.styles.fillColor = [220, 38, 38];
              } else if (aseguradora.includes('HDI')) {
                data.cell.styles.fillColor = [22, 163, 74];
              }
            }
            
            // Resaltar filas de costo
            if (data.section === 'body' && data.row.raw[0] && 
                data.row.raw[0].toLowerCase().includes('costo')) {
              data.cell.styles.fillColor = [255, 243, 205];
              data.cell.styles.fontStyle = 'bold';
            }
          }
        });
      } else {
        // Tabla simple sin autoTable
        let tableY = yPosition;
        const cellHeight = 8;
        const cellWidth = (pageWidth - 40) / headers.length;

        tableData.forEach((row, rowIndex) => {
          row.forEach((cell, colIndex) => {
            const x = 20 + (colIndex * cellWidth);
            const y = tableY + (rowIndex * cellHeight);
            
            // Background para headers
            if (rowIndex === 0) {
              doc.setFillColor(74, 85, 104);
              doc.rect(x, y - cellHeight + 2, cellWidth, cellHeight, 'F');
              doc.setTextColor(255);
              doc.setFont('helvetica', 'bold');
            } else {
              doc.setTextColor(0);
              doc.setFont('helvetica', 'normal');
            }
            
            // Texto
            doc.setFontSize(9);
            doc.text(String(cell).substring(0, 15), x + 2, y, { maxWidth: cellWidth - 4 });
            
            // Bordes
            doc.setDrawColor(0);
            doc.rect(x, y - cellHeight + 2, cellWidth, cellHeight);
          });
        });
      }

      // Pie de página
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100);
      doc.text('Documento generado automáticamente por CASIN - Sistema de Cotización', 
               pageWidth / 2, pageHeight - 10, { align: 'center' });

      // Descargar PDF
      const fileName = `Cotizacion_Tabla_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      
      toast.success('📄 PDF descargado exitosamente');

    } catch (error) {
      console.error('Error generating PDF:', error);
      
      // Fallback: usar CSV con extensión PDF
      generateCSVAsPDF();
    }
  };

  // Función helper para generar con html2pdf
  const generatePDFWithHtml2pdf = () => {
    try {
      const coberturas = cotizaciones.tabla_comparativa.coberturas;
      const aseguradoras = [];
      
      if (coberturas.length > 0) {
        Object.keys(coberturas[0]).forEach(key => {
          if (key !== 'cobertura') {
            aseguradoras.push(key);
          }
        });
      }

      // Crear elemento temporal para html2pdf
      const element = document.createElement('div');
      element.innerHTML = `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h1 style="text-align: center; color: #2c3e50;">COTIZACIÓN DE SEGUROS AUTOMÓVILES</h1>
          <p style="text-align: center;">Fecha: ${new Date().toLocaleDateString('es-MX')}</p>
          
          ${cotizaciones.vehiculo ? `
            <div style="background: #f8f9fa; padding: 15px; margin: 20px 0; border-radius: 8px;">
              <h3 style="margin: 0; color: #2c3e50;">${cotizaciones.vehiculo.marca || 'N/A'} ${cotizaciones.vehiculo.modelo || 'N/A'} ${cotizaciones.vehiculo.anio || 'N/A'}</h3>
              <p>C.P. ${cotizaciones.vehiculo.cp || 'N/A'} | COBERTURA AMPLIA</p>
            </div>
          ` : ''}
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <thead>
              <tr>
                <th style="background: #4a5568; color: white; padding: 10px; border: 1px solid #ddd;">COBERTURAS</th>
                ${aseguradoras.map(aseg => {
                  let bgColor = '#6b7280';
                  if (aseg.toUpperCase().includes('GNP')) bgColor = '#2563eb';
                  else if (aseg.toUpperCase().includes('QUALITAS')) bgColor = '#dc2626';
                  else if (aseg.toUpperCase().includes('HDI')) bgColor = '#16a34a';
                  
                  return `<th style="background: ${bgColor}; color: white; padding: 10px; border: 1px solid #ddd;">${aseg.replace(/_/g, ' ').toUpperCase()}</th>`;
                }).join('')}
              </tr>
            </thead>
            <tbody>
              ${coberturas.map(fila => {
                const isCostoRow = fila.cobertura && fila.cobertura.toLowerCase().includes('costo');
                return `
                  <tr style="${isCostoRow ? 'background: #fff3cd; font-weight: bold;' : ''}">
                    <td style="background: #e2e8f0; font-weight: bold; padding: 8px; border: 1px solid #ddd;">${fila.cobertura || 'N/A'}</td>
                    ${aseguradoras.map(aseg => 
                      `<td style="text-align: center; padding: 8px; border: 1px solid #ddd;">${fila[aseg] || 'N/A'}</td>`
                    ).join('')}
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
          
          <p style="text-align: center; font-size: 10px; color: #6c757d; margin-top: 30px;">
            Documento generado automáticamente por CASIN - Sistema de Cotización
          </p>
        </div>
      `;

      const opt = {
        margin: 1,
        filename: `Cotizacion_Tabla_${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'cm', format: 'a4', orientation: 'landscape' }
      };

      html2pdf().set(opt).from(element).save();
      toast.success('📄 PDF generado con html2pdf');
      
    } catch (error) {
      console.error('Error with html2pdf:', error);
      generateCSVAsPDF();
    }
  };

  // Función fallback para generar CSV como PDF
  const generateCSVAsPDF = () => {
    try {
      toast.warn('⚠️ Generando como archivo de texto (sin librerías PDF disponibles)');
      
      const coberturas = cotizaciones.tabla_comparativa.coberturas;
      const aseguradoras = [];
      
      if (coberturas.length > 0) {
        Object.keys(coberturas[0]).forEach(key => {
          if (key !== 'cobertura') {
            aseguradoras.push(key);
          }
        });
      }

      // Generar contenido de texto
      let content = `COTIZACIÓN DE SEGUROS AUTOMÓVILES\nFecha: ${new Date().toLocaleDateString('es-MX')}\n\n`;
      
      if (cotizaciones.vehiculo) {
        content += `INFORMACIÓN DEL VEHÍCULO\n`;
        content += `${cotizaciones.vehiculo.marca || 'N/A'} ${cotizaciones.vehiculo.modelo || 'N/A'} ${cotizaciones.vehiculo.anio || 'N/A'}\n`;
        content += `C.P. ${cotizaciones.vehiculo.cp || 'N/A'} | COBERTURA AMPLIA\n\n`;
      }

      content += `COBERTURAS\t${aseguradoras.join('\t')}\n`;
      content += '-'.repeat(80) + '\n';
      
      coberturas.forEach(fila => {
        content += `${fila.cobertura || 'N/A'}\t`;
        content += aseguradoras.map(aseg => fila[aseg] || 'N/A').join('\t');
        content += '\n';
      });

      content += '\nDocumento generado automáticamente por CASIN - Sistema de Cotización';

      // Descargar como archivo de texto
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Cotizacion_Tabla_${new Date().toISOString().split('T')[0]}.txt`;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }, 1000);
      
      toast.success('📄 Archivo de texto descargado (abrir e imprimir como PDF)');
      
    } catch (error) {
      console.error('Error generating fallback file:', error);
      toast.error('❌ Error al generar archivo');
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
                  <div className="file-actions">
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
                  className="btn-primary"
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
                        onClick={() => {
                          setFiles([]);
                          setExtractedTexts([]);
                          setCotizaciones(null);
                          setGeneratedMail('');
                          setClientData({ nombre: '', email: '', telefono: '', empresa: '' });
                          setSelectedSender('casin');
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
                      className="btn-secondary"
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
                        setSelectedSender('casin');
                        setSendBccToSender(true);
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
                          onClick={downloadTableAsCSV}
                          title="Exportar tabla como CSV"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14,2 14,8 20,8"/>
                            <line x1="16" y1="13" x2="8" y2="13"/>
                            <line x1="16" y1="17" x2="8" y2="17"/>
                            <polyline points="10,9 9,9 8,9"/>
                          </svg>
                          CSV
                        </button>
                        <button 
                          className="btn-outline"
                          onClick={downloadTableAsXLS}
                          title="Exportar tabla como Excel"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                            <circle cx="9" cy="9" r="2"/>
                            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
                          </svg>
                          Excel
                        </button>
                        <button 
                          className="btn-outline"
                          onClick={downloadTableAsPDF}
                          title="Exportar tabla como PDF"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14,2 14,8 20,8"/>
                            <line x1="16" y1="13" x2="8" y2="13"/>
                            <line x1="16" y1="17" x2="8" y2="17"/>
                            <polyline points="10,9 9,9 8,9"/>
                          </svg>
                          PDF Tabla
                        </button>
                        <button 
                          className="btn-outline"
                          onClick={() => {
                            setFiles([]);
                            setExtractedTexts([]);
                            setCotizaciones(null);
                            setGeneratedMail('');
                            setClientData({ nombre: '', email: '', telefono: '', empresa: '' });
                            setSelectedSender('casin');
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
                      placeholder="Ej: +52 55 0000-0000"
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

                  <div className="form-group form-group-full">
                    <label htmlFor="sender">Remitente del correo *</label>
                    <select
                      id="sender"
                      value={selectedSender}
                      onChange={(e) => setSelectedSender(e.target.value)}
                      className="sender-select"
                    >
                      <option value="casin">📧 CASIN Seguros (casinseguros@gmail.com)</option>
                      <option value="lore">📧 Lore Seguros (lorenacasin5@gmail.com)</option>
                      <option value="mich">📧 Mich Seguros (michelldiaz.casinseguros@gmail.com)</option>
                    </select>
                    <small className="sender-help">
                      Selecciona desde qué cuenta se enviará el correo al cliente
                    </small>
                  </div>

                  <div className="form-group form-group-full">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={sendBccToSender}
                        onChange={(e) => setSendBccToSender(e.target.checked)}
                        style={{ marginRight: '8px' }}
                      />
                      Enviar copia oculta (BCC) al remitente
                    </label>
                    <small className="sender-help">
                      Si está activado, el remitente recibirá una copia oculta del correo enviado
                    </small>
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
                        📧 Generando correo...
                      </>
                    ) : (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                          <polyline points="22,6 12,13 2,6"/>
                        </svg>
                        📧 Generar propuesta de correo
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {isGeneratingMail && (
          <div className="mail-generation-loading">
            <div className="loading-content">
              <div className="loading-spinner"></div>
              <h3>✨ Generando correo</h3>
              <div className="progress-container">
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${loadingProgress}%` }}
                  ></div>
                </div>
                <span className="progress-text">{loadingProgress}%</span>
              </div>
              <p>{loadingMessage}<span className="loading-dots"></span></p>
              <small>Nuestro asistente de IA está trabajando en su propuesta</small>
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
                  className="btn-primary"
                  onClick={sendDirectEmail}
                  disabled={isGeneratingMail}
                  title="Enviar correo directamente desde el servidor"
                  style={{ 
                    background: 'linear-gradient(135deg, #28a745, #20c997)',
                    borderColor: '#28a745'
                  }}
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
                      </svg>
                      📧 Enviar correo ahora
                    </>
                  )}
                </button>
                
                {/* Acciones secundarias */}
                <div className="secondary-actions">
                  <button 
                    className="btn-secondary"
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
                    className="btn-outline"
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
                  
                  <button 
                    className="btn-outline"
                    onClick={() => {
                      const plainText = generatedMail.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ');
                      navigator.clipboard.writeText(plainText);
                      toast.success('📝 Texto copiado al portapapeles');
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                    </svg>
                    Copiar texto
                  </button>
                </div>
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
                <div dangerouslySetInnerHTML={{ __html: generatedMail
                  // Limpiar todo el JSON visible
                  .replace(/^\s*\{\s*"correo"[\s\S]*$/g, '')
                  .replace(/\{\s*"correo"[\s\S]*?\}/g, '')
                  .replace(/```[\s\S]*?```/g, '')
                  .replace(/"{3}[\s\S]*?"{3}/g, '')
                  // Limpiar cualquier línea que contenga JSON
                  .replace(/.*"correo".*\n?/g, '')
                  .replace(/.*"html".*\n?/g, '')
                  .replace(/.*"asunto".*\n?/g, '')
                  // Limpiar líneas que empiecen con { o "
                  .replace(/^\s*[\{"].*\n?/gm, '')
                  .replace(/^\s*\}\s*\n?/gm, '')
                  // Limpiar espacios extra
                  .replace(/\n\s*\n\s*\n/g, '\n\n')
                  .replace(/^\s+|\s+$/g, '')
                  .trim()
                }} />
              </div>
            </div>


          </div>
        )}
      </div>
    </div>
  );
};

export default Cotiza;