import React, { useState, useEffect } from 'react';
import OpenAI from 'openai';
import tableService from '../../services/data/tableService';
import './TestGPT.css';
import { sendWelcomeEmail } from '../../services/emailService';

const API_URL = 'http://localhost:3001/api';

const TestGPT = () => {
  const [input, setInput] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState('');
  const [tableData, setTableData] = useState(null);
  const [prospeccionCards, setProspeccionCards] = useState([]);
  const [selectedCard, setSelectedCard] = useState('');
  const [emailConfig, setEmailConfig] = useState({
    to: '',
    subject: '',
    showConfig: false
  });
  const userId = "defaultUser";
  const [searchFilter, setSearchFilter] = useState('');
  const [filteredData, setFilteredData] = useState(null);

  const openai = new OpenAI({
    apiKey: import.meta.env.VITE_OPENAI_API_KEY,
    dangerouslyAllowBrowser: true
  });

  useEffect(() => {
    loadTables();
    loadProspeccionCards();
  }, []);

  const loadTables = async () => {
    try {
      const tablesData = await tableService.getTables();
      setTables(tablesData);
    } catch (error) {
      console.error('Error loading tables:', error);
    }
  };

  const loadProspeccionCards = async () => {
    try {
      const response = await fetch(`${API_URL}/prospeccion/${userId}`);
      if (!response.ok) throw new Error('Failed to load prospeccion cards');
      const data = await response.json();
      setProspeccionCards(data);
    } catch (error) {
      console.error('Error loading prospeccion cards:', error);
    }
  };

  const handleTableSelect = async (e) => {
    const tableName = e.target.value;
    setSelectedTable(tableName);
    setSelectedCard('');
    setSearchFilter(''); // Reset search filter
    setFilteredData(null);
    if (tableName) {
      try {
        const data = await tableService.getData(tableName);
        setTableData(data);
      } catch (error) {
        console.error('Error loading table data:', error);
        setTableData(null);
      }
    } else {
      setTableData(null);
    }
  };

  const handleCardSelect = (e) => {
    const cardId = e.target.value;
    setSelectedCard(cardId);
    setSelectedTable(''); // Clear selected table when card is selected
    setTableData(null);
  };

  const handleSearch = (value) => {
    setSearchFilter(value);
    if (!tableData || !tableData.data) return;

    if (!value.trim()) {
      setFilteredData(null);
      return;
    }

    // Filter data based on search term
    const searchTerms = value.toLowerCase().split(' ');
    const filtered = tableData.data.filter(row => {
      return searchTerms.every(term => 
        Object.values(row).some(val => 
          String(val).toLowerCase().includes(term)
        )
      );
    });

    setFilteredData({ ...tableData, data: filtered });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    setLoading(true);
    try {
      let systemPrompt = `Eres un asistente especializado en seguros que analiza información y genera respuestas detalladas.
      
      Si la información proviene de una tabla de la base de datos, genera un email siguiendo esta estructura:
      1. Saludo personalizado
      2. Mensaje de bienvenida
      3. Explicación detallada del seguro y sus beneficios
      4. Conclusión y próximos pasos
      
      Si la información proviene de una tarjeta de prospección, analiza y proporciona:
      1. Puntos clave identificados
      2. Oportunidades potenciales
      3. Pasos siguientes recomendados
      4. Factores de riesgo a considerar
      
      Usa el siguiente formato para resaltar elementos importantes:
      - Usa **texto en negrita** para títulos y elementos importantes
      - Usa *texto en cursiva* para énfasis moderado
      - Usa guiones (-) para listas
      
      El contenido debe ser en español, profesional y enfocado en el valor para el negocio.`;

      let userPrompt = input;
      
      // Use filtered data if available, otherwise use full data
      const dataToUse = filteredData || tableData;
      
      if (dataToUse && dataToUse.data.length > 0) {
        userPrompt = `Base de datos '${selectedTable}' contiene: ${JSON.stringify(dataToUse.data, null, 2)}\n\nBasado en estos datos, ${input}`;
      } else if (selectedCard) {
        const card = prospeccionCards.find(c => c.id === parseInt(selectedCard));
        if (card) {
          userPrompt = `Tarjeta de prospección contiene: ${card.content}\n\nAnaliza esta información y ${input}`;
        }
      }

      const completion = await openai.chat.completions.create({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        model: "gpt-4o-mini",
      });

      const gptResponse = completion.choices[0].message.content;
      setResponse(gptResponse);

      // Remove automatic email sending
      // Only update prospeccion card if selected
      if (selectedCard) {
        await fetch(`${API_URL}/prospeccion/${userId}/${selectedCard}/analyze`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ analysis: gptResponse }),
        });
        loadProspeccionCards();
      }
    } catch (error) {
      console.error('Error:', error);
      setResponse(`Error: ${error.message || 'No se pudo obtener respuesta de GPT'}`);
      if (error.response) {
        console.error('Error response:', error.response.data);
        setResponse(`Error: ${error.response.data.error || error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmail = async () => {
    if (!emailConfig.to || !emailConfig.subject) {
      alert('Por favor completa el destinatario y asunto del email');
      return;
    }

    try {
      await sendWelcomeEmail(response, {
        to: emailConfig.to,
        subject: emailConfig.subject,
        clientName: tableData?.data[0]?.nombre || 'Cliente',
        policyNumber: tableData?.data[0]?.poliza || 'POL-' + new Date().getTime(),
        insuranceType: tableData?.data[0]?.tipo || 'Seguro',
        startDate: new Date().toLocaleDateString('es-MX'),
        coverage: tableData?.data[0]?.cobertura || 'Por definir',
        insuranceCompany: 'Cambiando Historias',
        emergencyPhone: '800-123-4567',
        supportEmail: 'soporte@cambiandohistorias.com.mx',
        policyUrl: '#',
        companyAddress: 'Av. Reforma 123, CDMX, México',
        companyName: 'Cambiando Historias',
        currentYear: new Date().getFullYear(),
        gptResponse: response
      });
      alert('Email enviado con éxito');
      setEmailConfig({ ...emailConfig, showConfig: false });
    } catch (error) {
      console.error('Error al enviar email:', error);
      alert('Error al enviar el email');
    }
  };

  const handleClear = () => {
    setInput('');
    setResponse('');
    setSelectedTable('');
    setSelectedCard('');
    setTableData(null);
    setEmailConfig({
      to: '',
      subject: '',
      showConfig: false
    });
  };

  const renderTablePreview = (data) => {
    if (!data || !data.length) return null;
    
    const columns = Object.keys(data[0]);
    
    return (
      <div className="table-preview-wrapper">
        <table className="preview-table">
          <thead>
            <tr>
              {columns.map(column => (
                <th key={column}>{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr key={index}>
                {columns.map(column => (
                  <td key={`${index}-${column}`}>
                    {row[column] !== null ? String(row[column]) : '-'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="testgpt-container">
      <div className="testgpt-header">
        <h2>Asistente GPT</h2>
        <p className="subtitle">Analiza datos y genera contenido personalizado</p>
      </div>
      <div className="testgpt-content">
        <div className="data-selector">
          <div className="selector-group">
            <label htmlFor="table-select">Datos de tabla:</label>
            <select
              id="table-select"
              value={selectedTable}
              onChange={handleTableSelect}
              className="data-select"
            >
              <option value="">Ninguna</option>
              {tables.map(table => (
                <option key={table.name} value={table.name}>
                  {table.name}
                </option>
              ))}
            </select>
          </div>

          <div className="selector-group">
            <label htmlFor="card-select">Tarjeta de prospección:</label>
            <select
              id="card-select"
              value={selectedCard}
              onChange={handleCardSelect}
              className="data-select"
            >
              <option value="">Ninguna</option>
              {prospeccionCards.map(card => (
                <option key={card.id} value={card.id}>
                  {card.title}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        {tableData && (
          <div className="data-preview">
            <div className="data-preview-header">
              <h3>Datos de Tabla:</h3>
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Buscar en los datos..."
                className="data-search-input"
              />
            </div>
            {filteredData && (
              <>
                {renderTablePreview(filteredData.data)}
                <div className="data-filter-info">
                  Mostrando {filteredData.data.length} de {tableData.data.length} registros
                </div>
              </>
            )}
            {!filteredData && (
              <div className="search-prompt">
                <p>Realiza una búsqueda en los datos para ver resultados 👆 </p>
              </div>
            )}
          </div>
        )}

        {selectedCard && (
          <div className="data-preview">
            <h3>Contenido de Tarjeta:</h3>
            <pre className="data-content">
              {prospeccionCards.find(c => c.id === parseInt(selectedCard))?.content || ''}
            </pre>
          </div>
        )}

        {(filteredData || selectedCard) && (
          <form onSubmit={handleSubmit} className="testgpt-form">
            <div className="input-group">
              <label htmlFor="prompt-input">¿Qué análisis necesitas?</label>
              <textarea
                id="prompt-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={selectedTable ? 
                  "Ejemplo: Genera un mensaje de bienvenida basado en estos datos..." :
                  "Ejemplo: Analiza esta información de prospección y sugiere próximos pasos..."}
                rows={4}
                className="testgpt-input"
              />
            </div>
            <div className="button-group">
              <button 
                type="submit" 
                className="testgpt-submit"
                disabled={loading || !input.trim()}
              >
                {loading ? 'Procesando...' : 'Analizar'}
              </button>
              <button 
                type="button"
                onClick={handleClear}
                className="testgpt-clear"
              >
                Limpiar
              </button>
            </div>
          </form>
        )}

        {response && (
          <div className="testgpt-response">
            <h3>Respuesta GPT:</h3>
            <div className="response-content">
              {response}
            </div>
            <div className="email-section">
              <button 
                onClick={() => setEmailConfig({ ...emailConfig, showConfig: !emailConfig.showConfig })}
                className="testgpt-submit email-toggle-btn"
              >
                {emailConfig.showConfig ? 'Ocultar Configuración Email' : 'Configurar Email'}
              </button>

              {emailConfig.showConfig && (
                <div className="email-config">
                  <div className="email-input-group">
                    <label htmlFor="email-to">Destinatario:</label>
                    <input
                      id="email-to"
                      type="email"
                      value={emailConfig.to}
                      onChange={(e) => setEmailConfig({ ...emailConfig, to: e.target.value })}
                      placeholder="correo@ejemplo.com"
                      className="email-input"
                    />
                  </div>
                  <div className="email-input-group">
                    <label htmlFor="email-subject">Asunto:</label>
                    <input
                      id="email-subject"
                      type="text"
                      value={emailConfig.subject}
                      onChange={(e) => setEmailConfig({ ...emailConfig, subject: e.target.value })}
                      placeholder="Asunto del email"
                      className="email-input"
                    />
                  </div>
                  <button 
                    onClick={handleSendEmail}
                    className="testgpt-submit send-email-btn"
                    disabled={!emailConfig.to || !emailConfig.subject}
                  >
                    Enviar Email
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TestGPT; 