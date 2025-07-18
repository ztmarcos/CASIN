import React, { useState, useEffect, useRef } from 'react';
import { API_URL } from '../../config/api.js';
import DriveSelector from '../Drive/DriveSelector.jsx';
import './TableMail.css';

const SENDER_OPTIONS = [
  {
    label: 'CASIN (casindb46@gmail.com)',
    value: import.meta.env.VITE_SMTP_USER_CASIN || 'casindb46@gmail.com',
    pass: import.meta.env.VITE_SMTP_PASS_CASIN || 'qlqvjpccsgfihszj',
    name: 'CASIN Seguros'
  },
  {
    label: 'Lore (lorenacasin5@gmail.com)',
    value: import.meta.env.VITE_SMTP_USER_LORE || 'lorenacasin5@gmail.com',
    pass: import.meta.env.VITE_SMTP_PASS_LORE || 'yxeyswjxsicwgoow',
    name: 'Lore Seguros'
  },
  {
    label: 'Mich (michelldiaz.casinseguros@gmail.com)',
    value: import.meta.env.VITE_SMTP_USER_MICH || 'michelldiaz.casinseguros@gmail.com',
    pass: import.meta.env.VITE_SMTP_PASS_MICH || 'klejsbcgpjmwoogg',
    name: 'Mich Seguros'
  }
];

const TableMail = ({ isOpen, onClose, rowData }) => {
  const [emailContent, setEmailContent] = useState({ subject: '', message: '' });
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [showDriveSelector, setShowDriveSelector] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [emailType, setEmailType] = useState('welcome_email');
  const fileInputRef = useRef(null);
  const [sender, setSender] = useState(SENDER_OPTIONS[0]);

  // Reset states when modal closes
  useEffect(() => {
    if (!isOpen) {
      setEmailContent({ subject: '', message: '' });
      setError(null);
      setSuccess(null);
      setAttachments([]);
      setSelectedFolder(null);
      setEmailType('welcome_email');
      setSender(SENDER_OPTIONS[0]); // Reset sender on close
    }
  }, [isOpen]);

  const extractEmail = (data) => {
    if (data && typeof data === 'object') {
      const emailFields = ['e_mail', 'email', 'correo', 'mail'];
      for (const field of emailFields) {
        if (data[field] && typeof data[field] === 'string' && data[field].includes('@')) {
          return data[field];
        }
      }
    }

    return '';
  };

  useEffect(() => {
    if (isOpen && rowData) {
      generateEmailContent();
    }
  }, [isOpen, rowData, emailType]);

  const generateEmailContent = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const emailAddress = extractEmail(rowData);
      if (!emailAddress) {
        throw new Error('No se encontró una dirección de correo válida');
      }

      console.log('Generando correo tipo:', emailType, 'para:', { ...rowData, email: emailAddress });

      const response = await fetch(`${API_URL}/gpt/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: emailType,
          data: { ...rowData, email: emailAddress }
        }),
      });

      if (!response.ok) {
        throw new Error('Error al conectar con el servidor');
      }

      const result = await response.json();
      
      if (result.emailContent) {
        console.log('Contenido generado:', result.emailContent);
        setEmailContent(result.emailContent);
      } else {
        throw new Error('No se pudo generar el contenido del correo');
      }
    } catch (err) {
      console.error('Error:', err);
      setError(err.message || 'Error al generar el correo. Por favor, intenta de nuevo.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files);
    
    // Validate file size (16MB limit)
    const maxSize = 16 * 1024 * 1024; // 16MB in bytes
    const validFiles = files.filter(file => {
      if (file.size > maxSize) {
        setError(`El archivo "${file.name}" excede el límite de 16MB`);
        return false;
      }
      return true;
    });

    // Add files to attachments
    const newAttachments = validFiles.map(file => ({
      id: Date.now() + Math.random(),
      file,
      name: file.name,
      size: file.size,
      type: file.type
    }));

    setAttachments(prev => [...prev, ...newAttachments]);
    
    // Clear the input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (attachmentId) => {
    setAttachments(prev => prev.filter(att => att.id !== attachmentId));
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const uploadAttachmentsToDrive = async () => {
    if (!selectedFolder || attachments.length === 0) {
      console.log('❌ Drive upload skipped:', { selectedFolder: !!selectedFolder, attachmentsCount: attachments.length });
      return [];
    }

    console.log('🚀 Starting Drive upload to folder:', selectedFolder.id);
    setIsUploading(true);
    const uploadedFiles = [];

    try {
      // Upload all files in a single request
      const formData = new FormData();
      formData.append('folderId', selectedFolder.id);
      
      // Add all files to FormData
      attachments.forEach((attachment, index) => {
        console.log(`📎 Adding file ${index + 1}:`, attachment.name);
        formData.append('files', attachment.file);
      });

      const uploadUrl = `${API_URL.replace('/api', '')}/drive/upload`;
      console.log('📤 Sending request to:', uploadUrl);
      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
      });

      console.log('📊 Drive response status:', response.status);

      if (!response.ok) {
        // If Drive upload is not available (503), continue without upload
        if (response.status === 503) {
          console.warn('⚠️ Google Drive upload not available, skipping upload');
          setSelectedFolder(null); // Clear folder selection
          return []; // Return empty array to continue without Drive links
        }
        throw new Error(`Error uploading files`);
      }

      const result = await response.json();
      console.log('📊 Drive upload result:', result);
      
      if (result.success && result.files) {
        console.log('✅ Drive upload successful, mapping files...');
        // Map uploaded files to original attachments
        result.files.forEach((driveFile, index) => {
          if (index < attachments.length) {
            uploadedFiles.push({
              ...attachments[index],
              driveFileId: driveFile.id,
              driveLink: driveFile.webViewLink
            });
          }
        });
        console.log('📎 Mapped uploaded files:', uploadedFiles);
      } else {
        console.log('❌ Drive upload failed or no files returned:', result);
      }
    } catch (error) {
      console.error('Error uploading to Drive:', error);
      // For Drive-related errors, clear the selection and continue without upload
      if (error.message.includes('Drive') || error.message.includes('503')) {
        setSelectedFolder(null);
        setError('Google Drive no disponible, enviando email sin subir archivos a Drive');
        return []; // Continue without Drive upload
      }
      throw error;
    } finally {
      setIsUploading(false);
    }

    return uploadedFiles;
  };

  const handleSendEmail = async () => {
    const emailAddress = extractEmail(rowData);
    if (!emailAddress) {
      setError('No se encontró una dirección de correo válida');
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      let uploadedFiles = [];
      
      // Upload attachments to Drive if folder is selected
      if (attachments.length > 0 && selectedFolder) {
        console.log('📤 Starting Drive upload process...');
        console.log('📂 Selected folder:', selectedFolder);
        console.log('📎 Attachments count:', attachments.length);
        setSuccess('Subiendo archivos a Drive...');
        uploadedFiles = await uploadAttachmentsToDrive();
        console.log('📤 Drive upload completed. Files:', uploadedFiles);
      }

      setSuccess('Enviando correo...');

      // If we have attachments, use FormData approach
      if (attachments.length > 0) {
        const formData = new FormData();
        
        // Add email data as JSON string
        formData.append('to', emailAddress);
        formData.append('subject', emailContent.subject);
        formData.append('htmlContent', emailContent.message);
        formData.append('from', sender.value);
        formData.append('fromName', sender.name);
        formData.append('fromPass', sender.pass);
        
        // Add drive links if any
        if (uploadedFiles.length > 0) {
          formData.append('driveLinks', JSON.stringify(uploadedFiles.map(file => ({
            name: file.name,
            link: file.driveLink
          }))));
        }

        // Add row data
        Object.keys(rowData).forEach(key => {
          if (rowData[key] !== null && rowData[key] !== undefined) {
            formData.append(key, String(rowData[key]));
          }
        });

        // Add attachments
        attachments.forEach((attachment, index) => {
          formData.append(`attachment`, attachment.file);
        });

        const response = await fetch(`${API_URL}/email/send-welcome`, {
          method: 'POST',
          body: formData
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Error al enviar el correo');
        }

        const result = await response.json();
        console.log('Email enviado exitosamente:', result);
      } else {
        // No attachments, use JSON approach
        const emailData = {
          to: emailAddress,
          htmlContent: emailContent.message,
          subject: emailContent.subject,
          from: sender.value,
          fromName: sender.name,
          fromPass: sender.pass,
          driveLinks: uploadedFiles.map(file => ({
            name: file.name,
            link: file.driveLink
          })),
          ...rowData
        };

        const response = await fetch(`${API_URL}/email/send-welcome`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(emailData)
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Error al enviar el correo');
        }

        const result = await response.json();
        console.log('Email enviado exitosamente:', result);
      }

      setSuccess('¡Correo enviado exitosamente!');
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error) {
      console.error('Error al enviar el correo:', error);
      setError(error.message || 'Error al enviar el correo. Por favor, intenta de nuevo.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="mail-modal-overlay" onClick={onClose}>
      <div className="mail-modal-content" onClick={e => e.stopPropagation()}>
        <div className="mail-modal-header">
          <h3>📧 Enviar Correo Electrónico</h3>
          <button 
            className="close-modal-btn"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <div className="mail-modal-body">
          {error && (
            <div className="mail-error">
              {error}
            </div>
          )}
          {success && (
            <div className="mail-success">
              {success}
            </div>
          )}
          <div className="mail-field">
            <label>Remitente:</label>
            <select
              className="mail-input"
              value={sender.value + '-' + sender.pass}
              onChange={e => {
                const [value, pass] = e.target.value.split('-');
                const found = SENDER_OPTIONS.find(opt => opt.value === value && opt.pass === pass);
                setSender(found || SENDER_OPTIONS[0]);
              }}
              disabled={isGenerating}
            >
              {SENDER_OPTIONS.map(opt => (
                <option key={opt.value + '-' + opt.pass} value={opt.value + '-' + opt.pass}>{opt.label}</option>
              ))}
            </select>
            <small className="email-type-help">Elige el remitente del correo</small>
          </div>
          <div className="mail-field">
            <label>Para:</label>
            <input 
              type="email" 
              value={extractEmail(rowData)} 
              readOnly 
              className="mail-input"
            />
          </div>
          
          {/* Selector de tipo de email */}
          <div className="mail-field">
            <label>Tipo de Correo:</label>
            <select 
              className="mail-input"
              value={emailType}
              onChange={(e) => setEmailType(e.target.value)}
              disabled={isGenerating}
            >
              <option value="welcome_email">🎉 Bienvenida / Confirmación de Póliza</option>
              <option value="reminder_email">⚠️ Recordatorio / Renovación</option>
              <option value="info_email">📋 Información General</option>
            </select>
            <small className="email-type-help">
              Seleccione el tipo de correo para generar el contenido apropiado
            </small>
          </div>
          
          <div className="mail-field">
            <label>Asunto:</label>
            <input 
              type="text" 
              className="mail-input"
              placeholder={isGenerating ? "Generando asunto..." : "Ingrese asunto..."}
              value={emailContent.subject}
              onChange={(e) => setEmailContent(prev => ({ ...prev, subject: e.target.value }))}
              disabled={isGenerating}
            />
          </div>
          <div className="mail-field">
            <label>Mensaje:</label>
            <textarea 
              className="mail-textarea"
              placeholder={isGenerating ? "Generando contenido..." : "Escriba su mensaje..."}
              value={emailContent.message}
              onChange={(e) => setEmailContent(prev => ({ ...prev, message: e.target.value }))}
              rows={8}
              disabled={isGenerating}
            />
          </div>

          {/* Attachments Section */}
          <div className="mail-field">
            <label>Adjuntos:</label>
            <div className="attachments-section">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                multiple
                style={{ display: 'none' }}
                accept="*/*"
              />
              <div className="attachment-controls">
                <button 
                  type="button"
                  className="attach-btn"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isGenerating || isUploading}
                >
                  📎 Adjuntar Archivos
                </button>
                <button 
                  type="button"
                  className="drive-folder-btn"
                  onClick={() => setShowDriveSelector(true)}
                  disabled={isGenerating || isUploading}
                >
                  📁 Seleccionar Carpeta Drive
                </button>
              </div>
              
              {selectedFolder && (
                <div className="selected-folder">
                  <span className="folder-info">
                    📁 Carpeta seleccionada: <strong>{selectedFolder.name}</strong>
                  </span>
                  <button 
                    type="button"
                    className="remove-folder-btn"
                    onClick={() => setSelectedFolder(null)}
                  >
                    ✕
                  </button>
                </div>
              )}

              {attachments.length > 0 && (
                <div className="attachments-list">
                  {attachments.map(attachment => (
                    <div key={attachment.id} className="attachment-item">
                      <div className="attachment-info">
                        <span className="attachment-name">{attachment.name}</span>
                        <span className="attachment-size">({formatFileSize(attachment.size)})</span>
                      </div>
                      <button 
                        type="button"
                        className="remove-attachment-btn"
                        onClick={() => removeAttachment(attachment.id)}
                        disabled={isUploading}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <div className="attachments-summary">
                    Total: {attachments.length} archivo(s) - {formatFileSize(attachments.reduce((sum, att) => sum + att.size, 0))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mail-actions">
            <button 
              className="regenerate-btn"
              onClick={generateEmailContent}
              disabled={isGenerating || isUploading}
            >
              {isGenerating ? 'Generando...' : 'Regenerar Contenido'}
            </button>
          </div>
        </div>
        <div className="mail-modal-footer">
          <button 
            className="cancel-btn"
            onClick={onClose}
          >
            Cancelar
          </button>
          <button 
            className="send-btn"
            onClick={handleSendEmail}
            disabled={isGenerating || isUploading || !emailContent.subject || !emailContent.message || !extractEmail(rowData)}
          >
            {isUploading ? 'Subiendo archivos...' : 'Enviar Correo'}
          </button>
        </div>

        {/* Drive Selector Modal */}
        <DriveSelector
          isOpen={showDriveSelector}
          onClose={() => setShowDriveSelector(false)}
          onFolderSelect={setSelectedFolder}
          selectedFolderId={selectedFolder?.id}
        />
      </div>
    </div>
  );
};

export default TableMail; 