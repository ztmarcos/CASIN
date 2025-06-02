import React, { useState, useEffect, useRef } from 'react';
import { API_URL } from '../../config/api.js';
import DriveSelector from '../Drive/DriveSelector.jsx';
import './TableMail.css';

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

  // Reset states when modal closes
  useEffect(() => {
    if (!isOpen) {
      setEmailContent({ subject: '', message: '' });
      setError(null);
      setSuccess(null);
      setAttachments([]);
      setSelectedFolder(null);
      setEmailType('welcome_email');
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
    if (!selectedFolder || attachments.length === 0) return [];

    setIsUploading(true);
    const uploadedFiles = [];

    try {
      for (const attachment of attachments) {
        const formData = new FormData();
        formData.append('file', attachment.file);
        formData.append('folderId', selectedFolder.id);

        const response = await fetch(`${API_URL}/drive/upload`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Error uploading ${attachment.name}`);
        }

        const result = await response.json();
        uploadedFiles.push({
          ...attachment,
          driveFileId: result.id,
          driveLink: result.webViewLink
        });
      }
    } catch (error) {
      console.error('Error uploading to Drive:', error);
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
        setSuccess('Subiendo archivos a Drive...');
        uploadedFiles = await uploadAttachmentsToDrive();
      }

      setSuccess('Enviando correo...');

      // If we have attachments, use FormData approach
      if (attachments.length > 0) {
        const formData = new FormData();
        
        // Add email data as JSON string
        formData.append('to', emailAddress);
        formData.append('subject', emailContent.subject);
        formData.append('gptResponse', emailContent.message);
        
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
          gptResponse: emailContent.message,
          subject: emailContent.subject,
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