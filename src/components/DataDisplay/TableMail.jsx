import React, { useState, useEffect } from 'react';
import './TableMail.css';

const TableMail = ({ isOpen, onClose, rowData }) => {
  const [emailContent, setEmailContent] = useState({
    subject: '',
    message: ''
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Función para extraer el email de diferentes campos posibles
  const extractEmail = (data) => {
    const possibleFields = ['email', 'e-mail', 'e_mail', 'mail', 'correo', 'correo_electronico', 'email_address'];
    
    for (const field of possibleFields) {
      if (data[field] && typeof data[field] === 'string' && data[field].includes('@')) {
        return data[field];
      }
    }
    
    // Buscar en cualquier campo que contenga la palabra email o correo
    for (const [key, value] of Object.entries(data)) {
      if (
        typeof value === 'string' && 
        value.includes('@') && 
        (key.toLowerCase().includes('email') || 
         key.toLowerCase().includes('mail') || 
         key.toLowerCase().includes('correo'))
      ) {
        return value;
      }
    }

    return '';
  };

  useEffect(() => {
    if (isOpen && rowData) {
      generateEmailContent();
    }
  }, [isOpen, rowData]);

  const generateEmailContent = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const emailAddress = extractEmail(rowData);
      if (!emailAddress) {
        throw new Error('No se encontró una dirección de correo válida');
      }

      console.log('Generando correo para:', { ...rowData, email: emailAddress }); // Debug

      const response = await fetch('http://localhost:3001/api/gpt/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'welcome_email',
          data: { ...rowData, email: emailAddress }
        }),
      });

      if (!response.ok) {
        throw new Error('Error al conectar con el servidor');
      }

      const result = await response.json();
      
      if (result.emailContent) {
        console.log('Contenido generado:', result.emailContent); // Debug
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

  const handleSendEmail = async () => {
    const emailAddress = extractEmail(rowData);
    if (!emailAddress) {
      setError('No se encontró una dirección de correo válida');
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('http://localhost:3001/api/email/send-welcome', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: emailAddress,
          gptResponse: emailContent.message,
          subject: emailContent.subject,
          ...rowData
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al enviar el correo');
      }

      const result = await response.json();
      console.log('Email enviado exitosamente:', result);
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
          <h3>Enviar Correo de Bienvenida</h3>
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
              rows={12}
              disabled={isGenerating}
            />
          </div>
          <div className="mail-actions">
            <button 
              className="regenerate-btn"
              onClick={generateEmailContent}
              disabled={isGenerating}
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
            disabled={isGenerating || !emailContent.subject || !emailContent.message || !extractEmail(rowData)}
          >
            Enviar Correo
          </button>
        </div>
      </div>
    </div>
  );
};

export default TableMail; 