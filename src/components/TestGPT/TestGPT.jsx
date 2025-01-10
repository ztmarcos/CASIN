import React, { useState, useEffect } from 'react';
import OpenAI from 'openai';
import databaseService from '../../services/data/database';
import './TestGPT.css';
import { sendWelcomeEmail } from '../../services/emailService';

const TestGPT = () => {
  const [input, setInput] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState('');
  const [tableData, setTableData] = useState(null);

  const openai = new OpenAI({
    apiKey: import.meta.env.VITE_OPENAI_API_KEY,
    dangerouslyAllowBrowser: true
  });

  useEffect(() => {
    loadTables();
  }, []);

  const loadTables = async () => {
    try {
      const tablesData = await databaseService.getTables();
      setTables(tablesData);
    } catch (error) {
      console.error('Error loading tables:', error);
    }
  };

  const handleTableSelect = async (e) => {
    const tableName = e.target.value;
    setSelectedTable(tableName);
    if (tableName) {
      try {
        const data = await databaseService.getData(tableName);
        setTableData(data);
      } catch (error) {
        console.error('Error loading table data:', error);
        setTableData(null);
      }
    } else {
      setTableData(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    setLoading(true);
    try {
      let systemPrompt = `Eres un asistente especializado en seguros que genera contenidos para emails de bienvenida.
      Genera el contenido siguiendo esta estructura:
      
      1. Saludo personalizado
      2. Mensaje de bienvenida
      3. Explicación detallada del seguro y sus beneficios
      4. Conclusión y próximos pasos
      
      Usa el siguiente formato para resaltar elementos importantes:
      - Usa **texto en negrita** para títulos y elementos importantes
      - Usa *texto en cursiva* para énfasis moderado
      - Usa guiones (-) para listas de beneficios o pasos
      
      El contenido debe ser en español, profesional pero cálido, y enfocado en el valor del seguro para el cliente.
      
      Asegúrate de dejar espacios entre párrafos usando doble salto de línea para mejor legibilidad.`;

      let userPrompt = input;
      
      if (tableData && tableData.data.length > 0) {
        userPrompt = `Base de datos '${selectedTable}' contiene: ${JSON.stringify(tableData.data, null, 2)}\n\nBasado en estos datos, ${input}`;
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

      // Send email with GPT response
      await sendWelcomeEmail(gptResponse);
    } catch (error) {
      console.error('Error:', error);
      setResponse('Error: No se pudo obtener respuesta de GPT');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="testgpt-container">
      <div className="testgpt-header">
        <h2>Asistente de Emails de Seguros</h2>
        <p className="subtitle">Genera contenido personalizado para emails de seguros</p>
      </div>
      <div className="testgpt-content">
        <div className="table-selector">
          <label htmlFor="table-select">Incluir datos de tabla:</label>
          <select
            id="table-select"
            value={selectedTable}
            onChange={handleTableSelect}
            className="table-select"
          >
            <option value="">Ninguna</option>
            {tables.map(table => (
              <option key={table.name} value={table.name}>
                {table.name}
              </option>
            ))}
          </select>
        </div>
        
        {tableData && (
          <div className="data-preview">
            <h3>Datos Seleccionados:</h3>
            <pre className="data-content">
              {JSON.stringify(tableData.data, null, 2)}
            </pre>
          </div>
        )}

        <form onSubmit={handleSubmit} className="testgpt-form">
          <div className="input-group">
            <label htmlFor="prompt-input">¿Qué tipo de contenido necesitas?</label>
            <textarea
              id="prompt-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ejemplo: Genera un mensaje de bienvenida para un cliente de seguro de vida..."
              rows={4}
              className="testgpt-input"
            />
          </div>
          <button 
            type="submit" 
            className="testgpt-submit"
            disabled={loading || !input.trim()}
          >
            {loading ? 'Generando...' : 'Generar Contenido'}
          </button>
        </form>
        {response && (
          <div className="testgpt-response">
            <h3>Contenido Generado:</h3>
            <textarea
              value={response}
              readOnly
              className="response-content"
              rows={10}
            />
            <button 
              onClick={async () => {
                try {
                  await sendWelcomeEmail(response);
                  alert('Email enviado nuevamente con éxito');
                } catch (error) {
                  console.error('Error al reenviar email:', error);
                  alert('Error al reenviar el email');
                }
              }}
              className="testgpt-submit"
              style={{ marginTop: '10px' }}
            >
              Enviar Email Nuevamente
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TestGPT; 