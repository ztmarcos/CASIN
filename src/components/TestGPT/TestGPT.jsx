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
  const userId = "defaultUser";

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
    setSelectedCard(''); // Clear selected card when table is selected
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
      
      if (tableData && tableData.data.length > 0) {
        userPrompt = `Base de datos '${selectedTable}' contiene: ${JSON.stringify(tableData.data, null, 2)}\n\nBasado en estos datos, ${input}`;
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

      // If we're working with a table, send email
      if (selectedTable) {
        await sendWelcomeEmail(gptResponse, {
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
          gptResponse: gptResponse
        });
      }
      // If we're working with a prospeccion card, update its analysis
      else if (selectedCard) {
        await fetch(`${API_URL}/prospeccion/${userId}/${selectedCard}/analyze`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ analysis: gptResponse }),
        });
        loadProspeccionCards(); // Reload cards to get updated analysis
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
              disabled={selectedCard !== ''}
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
              disabled={selectedTable !== ''}
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
            <h3>Datos de Tabla:</h3>
            <pre className="data-content">
              {JSON.stringify(tableData.data, null, 2)}
            </pre>
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
          <button 
            type="submit" 
            className="testgpt-submit"
            disabled={loading || !input.trim() || (!selectedTable && !selectedCard)}
          >
            {loading ? 'Procesando...' : 'Analizar'}
          </button>
        </form>

        {response && (
          <div className="testgpt-response">
            <h3>Respuesta GPT:</h3>
            <div className="response-content">
              {response}
            </div>
            {selectedTable && (
              <button 
                onClick={async () => {
                  try {
                    await sendWelcomeEmail(response);
                    alert('Email enviado con éxito');
                  } catch (error) {
                    console.error('Error al enviar email:', error);
                    alert('Error al enviar el email');
                  }
                }}
                className="testgpt-submit email-button"
              >
                Enviar por Email
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TestGPT; 