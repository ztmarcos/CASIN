import React, { useState, useEffect } from 'react';
import activityService from '../../services/activityService';
import { API_URL } from '../../config/api.js';
import './Resumen.css';
import { toast } from 'react-hot-toast';

const Resumen = () => {
  const [loading, setLoading] = useState(false);
  const [summaryData, setSummaryData] = useState(null);
  const [gptSummary, setGptSummary] = useState(null);
  const [dateRange, setDateRange] = useState('last7days');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [autoGenerate, setAutoGenerate] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  // Load auto-generate setting from Firebase
  useEffect(() => {
    loadAutoGenerateSetting();
  }, []);

  const loadAutoGenerateSetting = async () => {
    try {
      const response = await fetch(`${API_URL}/app-config/resumen-auto-generate`);
      if (response.ok) {
        const result = await response.json();
        setAutoGenerate(result.enabled || false);
      }
    } catch (error) {
      console.log('Could not load auto-generate setting:', error);
    }
  };

  const saveAutoGenerateSetting = async (enabled) => {
    try {
      await fetch(`${API_URL}/app-config/resumen-auto-generate`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled })
      });
      setAutoGenerate(enabled);
      toast.success(`Auto-generación ${enabled ? 'activada' : 'desactivada'}`);
    } catch (error) {
      console.error('Error saving auto-generate setting:', error);
      toast.error('Error al guardar configuración');
    }
  };

  const getDateRangeValues = () => {
    switch (dateRange) {
      case 'last7days':
        return activityService.getLast7DaysRange();
      case 'lastweek':
        return activityService.getLastWeekRange();
      case 'custom':
        return {
          startDate: new Date(customStartDate),
          endDate: new Date(customEndDate)
        };
      default:
        return activityService.getLast7DaysRange();
    }
  };

  const generateResumen = async () => {
    setLoading(true);
    setGptSummary(null);
    
    try {
      const { startDate, endDate } = getDateRangeValues();
      
      console.log('📊 Generating resumen for:', {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      });
      
      // Step 1: Get all the data
      const data = await activityService.generateSummaryData(startDate, endDate);
      setSummaryData(data);
      
      console.log('📊 Summary data generated:', data);
      
      // Step 2: Send to GPT for analysis
      console.log('🤖 Sending to GPT for analysis...');
      
      const response = await fetch(`${API_URL}/gpt/analyze-activity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        throw new Error(`GPT analysis failed: ${response.status}`);
      }
      
      const gptResult = await response.json();
      console.log('✅ GPT analysis result:', gptResult);
      
      setGptSummary(gptResult);
      toast.success('Resumen generado exitosamente');
      
    } catch (error) {
      console.error('❌ Error generating resumen:', error);
      toast.error('Error al generar resumen: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const sendEmailReport = async () => {
    if (!gptSummary || !summaryData) {
      toast.error('Primero genera un resumen');
      return;
    }
    
    setSendingEmail(true);
    
    try {
      const { startDate, endDate } = getDateRangeValues();
      const dateRangeText = `${startDate.toLocaleDateString('es-MX')} - ${endDate.toLocaleDateString('es-MX')}`;
      
      // Create email HTML
      const emailHTML = createEmailHTML(gptSummary, summaryData, dateRangeText);
      
      // Send email
      const response = await fetch(`${API_URL}/email/send-welcome`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: 'ztmarcos@gmail.com',
          subject: `Resumen Semanal de Actividad - ${dateRangeText}`,
          htmlContent: emailHTML,
          from: 'casinseguros@gmail.com',
          fromPass: process.env.GMAIL_APP_PASSWORD || 'espajcgariyhsboq',
          fromName: 'CASIN Seguros - Resumen Automático'
        })
      });
      
      if (!response.ok) {
        throw new Error('Error al enviar email');
      }
      
      const result = await response.json();
      console.log('✅ Email sent:', result);
      
      toast.success('Email enviado exitosamente a ztmarcos@gmail.com');
      
    } catch (error) {
      console.error('❌ Error sending email:', error);
      toast.error('Error al enviar email: ' + error.message);
    } finally {
      setSendingEmail(false);
    }
  };

  const createEmailHTML = (gptSummary, summaryData, dateRangeText) => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Resumen Semanal de Actividad</title>
      </head>
      <body style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #f5f7fa; margin: 0; padding: 0;">
        <div style="max-width: 800px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0 0 10px 0; font-size: 32px; font-weight: 700;">📊 Resumen de Actividad</h1>
            <p style="color: #e0e7ff; margin: 0; font-size: 18px;">${dateRangeText}</p>
          </div>
          
          <!-- Summary Stats -->
          <div style="padding: 30px;">
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px;">
              
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 20px; text-align: center; color: white;">
                <div style="font-size: 36px; font-weight: bold; margin-bottom: 5px;">${summaryData.summary.totalActivities}</div>
                <div style="font-size: 14px; opacity: 0.9;">Total Actividades</div>
              </div>
              
              <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); border-radius: 12px; padding: 20px; text-align: center; color: white;">
                <div style="font-size: 36px; font-weight: bold; margin-bottom: 5px;">${summaryData.summary.totalExpiring}</div>
                <div style="font-size: 14px; opacity: 0.9;">Pólizas por Vencer</div>
              </div>
              
              <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); border-radius: 12px; padding: 20px; text-align: center; color: white;">
                <div style="font-size: 36px; font-weight: bold; margin-bottom: 5px;">${summaryData.summary.totalPartialPayments}</div>
                <div style="font-size: 14px; opacity: 0.9;">Pagos Pendientes</div>
              </div>
              
              <div style="background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); border-radius: 12px; padding: 20px; text-align: center; color: white;">
                <div style="font-size: 36px; font-weight: bold; margin-bottom: 5px;">${summaryData.summary.activeUsers}</div>
                <div style="font-size: 14px; opacity: 0.9;">Usuarios Activos</div>
              </div>
              
            </div>
            
            <!-- GPT Analysis -->
            <div style="background-color: #f8fafc; border-radius: 12px; padding: 25px; margin-bottom: 30px; border-left: 4px solid #667eea;">
              <h2 style="color: #1e293b; margin: 0 0 15px 0; font-size: 22px;">🤖 Análisis Inteligente</h2>
              <div style="color: #475569; line-height: 1.8; font-size: 15px;">
                ${gptSummary.summary ? gptSummary.summary.replace(/\n/g, '<br>') : 'No hay análisis disponible'}
              </div>
            </div>
            
            <!-- Expiring Policies -->
            ${summaryData.expiringPolicies.total > 0 ? `
            <div style="margin-bottom: 30px;">
              <h2 style="color: #1e293b; margin: 0 0 15px 0; font-size: 22px;">⚠️ Pólizas por Vencer (Próximos 7 días)</h2>
              <div style="background-color: #fff7ed; border-radius: 8px; padding: 20px; border: 1px solid #fed7aa;">
                <table style="width: 100%; border-collapse: collapse;">
                  <thead>
                    <tr style="background-color: #fef3c7; border-bottom: 2px solid #fbbf24;">
                      <th style="padding: 10px; text-align: left; font-size: 14px;">Contratante</th>
                      <th style="padding: 10px; text-align: left; font-size: 14px;">Póliza</th>
                      <th style="padding: 10px; text-align: left; font-size: 14px;">Aseguradora</th>
                      <th style="padding: 10px; text-align: left; font-size: 14px;">Vencimiento</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${summaryData.expiringPolicies.policies.slice(0, 5).map(policy => `
                      <tr style="border-bottom: 1px solid #fed7aa;">
                        <td style="padding: 10px; font-size: 13px;">${policy.nombre_contratante || 'N/A'}</td>
                        <td style="padding: 10px; font-size: 13px;">${policy.numero_poliza || 'N/A'}</td>
                        <td style="padding: 10px; font-size: 13px;">${policy.aseguradora || 'N/A'}</td>
                        <td style="padding: 10px; font-size: 13px;">${new Date(policy.fecha_fin).toLocaleDateString('es-MX')}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
            ` : ''}
            
            <!-- Partial Payments -->
            ${summaryData.partialPayments.total > 0 ? `
            <div style="margin-bottom: 30px;">
              <h2 style="color: #1e293b; margin: 0 0 15px 0; font-size: 22px;">💰 Pagos Parciales Pendientes</h2>
              <div style="background-color: #eff6ff; border-radius: 8px; padding: 20px; border: 1px solid #bfdbfe;">
                <table style="width: 100%; border-collapse: collapse;">
                  <thead>
                    <tr style="background-color: #dbeafe; border-bottom: 2px solid #3b82f6;">
                      <th style="padding: 10px; text-align: left; font-size: 14px;">Contratante</th>
                      <th style="padding: 10px; text-align: left; font-size: 14px;">Póliza</th>
                      <th style="padding: 10px; text-align: left; font-size: 14px;">Forma Pago</th>
                      <th style="padding: 10px; text-align: left; font-size: 14px;">Próximo Pago</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${summaryData.partialPayments.payments.slice(0, 5).map(policy => `
                      <tr style="border-bottom: 1px solid #bfdbfe;">
                        <td style="padding: 10px; font-size: 13px;">${policy.nombre_contratante || 'N/A'}</td>
                        <td style="padding: 10px; font-size: 13px;">${policy.numero_poliza || 'N/A'}</td>
                        <td style="padding: 10px; font-size: 13px;">${policy.forma_pago || 'N/A'}</td>
                        <td style="padding: 10px; font-size: 13px;">${policy.fecha_proximo_pago ? new Date(policy.fecha_proximo_pago).toLocaleDateString('es-MX') : 'N/A'}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
                <p style="margin: 15px 0 0 0; color: #1e40af; font-weight: bold;">
                  Total estimado: $${summaryData.partialPayments.totalAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
            ` : ''}
            
            <!-- User Activity -->
            <div style="margin-bottom: 30px;">
              <h2 style="color: #1e293b; margin: 0 0 15px 0; font-size: 22px;">👥 Actividad por Usuario</h2>
              <div style="background-color: #f0fdf4; border-radius: 8px; padding: 20px; border: 1px solid #bbf7d0;">
                ${Object.entries(summaryData.userActivity).map(([user, stats]) => `
                  <div style="margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid #bbf7d0;">
                    <div style="font-weight: bold; color: #166534; margin-bottom: 8px;">${user}</div>
                    <div style="font-size: 13px; color: #15803d;">
                      📧 Emails: ${stats.email_sent || 0} | 
                      📝 Capturas: ${stats.data_captured || 0} | 
                      ✏️ Actualizaciones: ${stats.data_updated || 0} |
                      📄 PDFs: ${stats.pdf_analyzed || 0}
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
            
          </div>
          
          <!-- Footer -->
          <div style="background-color: #f8fafc; padding: 25px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #64748b; margin: 0 0 10px 0; font-size: 14px;">Generado automáticamente por CASIN Seguros CRM</p>
            <p style="color: #94a3b8; margin: 0; font-size: 12px;">${new Date().toLocaleString('es-MX')}</p>
          </div>
          
        </div>
      </body>
      </html>
    `;
  };

  const formatDateForInput = (date) => {
    return date.toISOString().split('T')[0];
  };

  return (
    <div className="resumen-container">
      <div className="resumen-header">
        <h1>📊 Resumen de Actividad</h1>
        <p className="subtitle">Análisis inteligente de actividades y métricas clave</p>
      </div>

      <div className="resumen-controls">
        <div className="date-range-selector">
          <label>Rango de Fechas:</label>
          <select 
            value={dateRange} 
            onChange={(e) => setDateRange(e.target.value)}
            disabled={loading}
          >
            <option value="last7days">Últimos 7 días</option>
            <option value="lastweek">Semana anterior (Lun-Dom)</option>
            <option value="custom">Personalizado</option>
          </select>
        </div>

        {dateRange === 'custom' && (
          <div className="custom-date-inputs">
            <div className="date-input-group">
              <label>Desde:</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="date-input-group">
              <label>Hasta:</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>
        )}

        <div className="action-buttons">
          <button 
            className="generate-btn primary"
            onClick={generateResumen}
            disabled={loading || (dateRange === 'custom' && (!customStartDate || !customEndDate))}
          >
            {loading ? '⏳ Generando...' : '🔄 Generar Resumen'}
          </button>

          {gptSummary && (
            <button 
              className="email-btn secondary"
              onClick={sendEmailReport}
              disabled={sendingEmail}
            >
              {sendingEmail ? '📤 Enviando...' : '📧 Enviar Email'}
            </button>
          )}
        </div>

        <div className="auto-generate-toggle">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={autoGenerate}
              onChange={(e) => saveAutoGenerateSetting(e.target.checked)}
            />
            <span>Generar automáticamente los viernes</span>
          </label>
        </div>
      </div>

      {loading && (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Generando resumen inteligente...</p>
        </div>
      )}

      {gptSummary && summaryData && !loading && (
        <div className="resumen-content">
          {/* Summary Stats Cards */}
          <div className="stats-grid">
            <div className="stat-card purple">
              <div className="stat-value">{summaryData.summary.totalActivities}</div>
              <div className="stat-label">Total Actividades</div>
            </div>
            <div className="stat-card pink">
              <div className="stat-value">{summaryData.summary.totalExpiring}</div>
              <div className="stat-label">Pólizas por Vencer</div>
            </div>
            <div className="stat-card blue">
              <div className="stat-value">{summaryData.summary.totalPartialPayments}</div>
              <div className="stat-label">Pagos Pendientes</div>
            </div>
            <div className="stat-card green">
              <div className="stat-value">{summaryData.summary.activeUsers}</div>
              <div className="stat-label">Usuarios Activos</div>
            </div>
          </div>

          {/* GPT Analysis */}
          <div className="gpt-analysis-card">
            <h2>🤖 Análisis Inteligente</h2>
            <div className="analysis-content">
              {gptSummary.summary ? (
                <p>{gptSummary.summary}</p>
              ) : (
                <p>No hay análisis disponible</p>
              )}
            </div>
          </div>

          {/* Expiring Policies */}
          {summaryData.expiringPolicies.total > 0 && (
            <div className="section-card warning">
              <h2>⚠️ Pólizas por Vencer (Próximos 7 días)</h2>
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Contratante</th>
                      <th>Póliza</th>
                      <th>Aseguradora</th>
                      <th>Vencimiento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summaryData.expiringPolicies.policies.slice(0, 10).map((policy, idx) => (
                      <tr key={idx}>
                        <td>{policy.nombre_contratante || 'N/A'}</td>
                        <td>{policy.numero_poliza || 'N/A'}</td>
                        <td>{policy.aseguradora || 'N/A'}</td>
                        <td>{new Date(policy.fecha_fin).toLocaleDateString('es-MX')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Partial Payments */}
          {summaryData.partialPayments.total > 0 && (
            <div className="section-card info">
              <h2>💰 Pagos Parciales Pendientes</h2>
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Contratante</th>
                      <th>Póliza</th>
                      <th>Forma Pago</th>
                      <th>Próximo Pago</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summaryData.partialPayments.payments.slice(0, 10).map((policy, idx) => (
                      <tr key={idx}>
                        <td>{policy.nombre_contratante || 'N/A'}</td>
                        <td>{policy.numero_poliza || 'N/A'}</td>
                        <td>{policy.forma_pago || 'N/A'}</td>
                        <td>{policy.fecha_proximo_pago ? new Date(policy.fecha_proximo_pago).toLocaleDateString('es-MX') : 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="total-amount">
                  <strong>Total estimado: </strong>
                  ${summaryData.partialPayments.totalAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          )}

          {/* User Activity */}
          <div className="section-card success">
            <h2>👥 Actividad por Usuario</h2>
            <div className="user-activity-list">
              {Object.entries(summaryData.userActivity).map(([user, stats]) => (
                <div key={user} className="user-activity-item">
                  <div className="user-name">{user}</div>
                  <div className="user-stats">
                    <span>📧 Emails: {stats.email_sent || 0}</span>
                    <span>📝 Capturas: {stats.data_captured || 0}</span>
                    <span>✏️ Actualizaciones: {stats.data_updated || 0}</span>
                    <span>📄 PDFs: {stats.pdf_analyzed || 0}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {!loading && !gptSummary && (
        <div className="empty-state">
          <div className="empty-icon">📊</div>
          <h3>No hay resumen generado</h3>
          <p>Selecciona un rango de fechas y haz clic en "Generar Resumen" para comenzar</p>
        </div>
      )}
    </div>
  );
};

export default Resumen;

