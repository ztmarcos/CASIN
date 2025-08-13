import React, { useState } from 'react';
import { sendEmailWithGmail } from '../../services/emailService';
import { sendReportEmailWithGmail } from '../../services/reportEmailService';
import { sendBirthdayEmail } from '../../services/birthdayService';
import { sendBirthdayEmailWithGmail } from '../../services/firebaseBirthdayService';
import './TestGPT.css';

const TestGPT = () => {
  const [input, setInput] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailTest, setEmailTest] = useState({
    to: '',
    subject: '',
    message: ''
  });
  const [emailResult, setEmailResult] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await fetch('/api/gpt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: input }),
      });
      
      const data = await response.json();
      setResponse(data.response);
    } catch (error) {
      console.error('Error:', error);
      setResponse('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const testGmailEmail = async () => {
    try {
      setEmailResult('Enviando email...');
      const result = await sendEmailWithGmail(
        emailTest.to,
        emailTest.subject,
        `<div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Test Email from CASIN Seguros</h2>
          <p>${emailTest.message}</p>
          <p><strong>Este es un email de prueba enviado desde el sistema CASIN Seguros.</strong></p>
          <p>Fecha: ${new Date().toLocaleString()}</p>
        </div>`,
        'CASIN Seguros - Test'
      );
      setEmailResult(`✅ Email enviado exitosamente: ${result.messageId}`);
    } catch (error) {
      setEmailResult(`❌ Error: ${error.message}`);
    }
  };

  const testBirthdayEmail = async () => {
    try {
      setEmailResult('Enviando email de cumpleaños...');
      const birthdayPerson = {
        nombre: 'Juan Pérez',
        email: emailTest.to
      };
      const result = await sendBirthdayEmail(birthdayPerson, '¡Que tengas un día fantástico!');
      setEmailResult(`✅ Email de cumpleaños enviado: ${result.messageId}`);
    } catch (error) {
      setEmailResult(`❌ Error: ${error.message}`);
    }
  };

  const testReportEmail = async () => {
    try {
      setEmailResult('Enviando email de reporte...');
      const mockPolicies = [
        { id: '1', numero: 'POL001', driveLink: 'https://drive.google.com/file/d/123' },
        { id: '2', numero: 'POL002', driveLink: 'https://drive.google.com/file/d/456' }
      ];
      const result = await sendReportEmailWithGmail(
        mockPolicies,
        'test',
        emailTest.to,
        'Reporte de Prueba - CASIN Seguros',
        `<div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Reporte de Prueba</h2>
          <p>${emailTest.message}</p>
          <p>Este reporte incluye ${mockPolicies.length} pólizas.</p>
        </div>`
      );
      setEmailResult(`✅ Email de reporte enviado: ${result.messageId}`);
    } catch (error) {
      setEmailResult(`❌ Error: ${error.message}`);
    }
  };

  return (
    <div className="test-gpt-container">
      <h1>Test GPT & Email Services</h1>
      
      {/* GPT Test Section */}
      <div className="test-section">
        <h2>🤖 Test GPT</h2>
        <form onSubmit={handleSubmit}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escribe tu prompt aquí..."
            rows="4"
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Enviando...' : 'Enviar'}
          </button>
        </form>
        {response && (
          <div className="response">
            <h3>Respuesta:</h3>
            <p>{response}</p>
          </div>
        )}
      </div>

      {/* Email Test Section */}
      <div className="test-section">
        <h2>📧 Test Email Services (Gmail)</h2>
        <div className="email-test-form">
          <input
            type="email"
            placeholder="Email destinatario"
            value={emailTest.to}
            onChange={(e) => setEmailTest({...emailTest, to: e.target.value})}
          />
          <input
            type="text"
            placeholder="Asunto"
            value={emailTest.subject}
            onChange={(e) => setEmailTest({...emailTest, subject: e.target.value})}
          />
          <textarea
            placeholder="Mensaje"
            value={emailTest.message}
            onChange={(e) => setEmailTest({...emailTest, message: e.target.value})}
            rows="3"
          />
          <div className="email-buttons">
            <button onClick={testGmailEmail}>📧 Test Gmail Email</button>
            <button onClick={testBirthdayEmail}>🎂 Test Birthday Email</button>
            <button onClick={testReportEmail}>📊 Test Report Email</button>
          </div>
        </div>
        {emailResult && (
          <div className="email-result">
            <h3>Resultado:</h3>
            <p>{emailResult}</p>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="instructions">
        <h3>📋 Instrucciones:</h3>
        <ul>
          <li><strong>GPT Test:</strong> Prueba la funcionalidad de OpenAI GPT</li>
          <li><strong>Gmail Email:</strong> Envía un email de prueba usando las nuevas credenciales de Gmail</li>
          <li><strong>Birthday Email:</strong> Envía un email de cumpleaños con diseño especial</li>
          <li><strong>Report Email:</strong> Envía un email de reporte con enlaces a Google Drive</li>
        </ul>
        <p><strong>Nota:</strong> Todos los emails se envían desde <code>casinseguros@gmail.com</code></p>
      </div>
    </div>
  );
};

export default TestGPT; 