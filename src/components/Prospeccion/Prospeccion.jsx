import React, { useState, useEffect } from 'react';
import './Prospeccion.css';

const API_URL = 'http://localhost:3001/api';

const Prospeccion = () => {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const userId = "defaultUser"; // This should come from your auth context

  useEffect(() => {
    loadCards();
  }, []);

  const loadCards = async () => {
    try {
      const response = await fetch(`${API_URL}/prospeccion/${userId}`);
      if (!response.ok) throw new Error('Failed to load cards');
      const data = await response.json();
      setCards(data);
    } catch (err) {
      setError('Error loading cards');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleTextChange = async (cardId, newContent) => {
    try {
      const response = await fetch(`${API_URL}/prospeccion/${userId}/${cardId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: newContent }),
      });
      
      if (!response.ok) throw new Error('Failed to update card');
      const updatedCard = await response.json();
      
      setCards(cards.map(card => 
        card.id === cardId ? { ...card, ...updatedCard } : card
      ));
    } catch (err) {
      setError('Error updating card');
      console.error(err);
    }
  };

  const addCard = async () => {
    try {
      const response = await fetch(`${API_URL}/prospeccion/${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: `Tarjeta ${cards.length + 1}` }),
      });
      
      if (!response.ok) throw new Error('Failed to create card');
      const newCard = await response.json();
      
      setCards([...cards, newCard]);
    } catch (err) {
      setError('Error creating card');
      console.error(err);
    }
  };

  const analyzeWithGPT = async (cardId) => {
    try {
      const response = await fetch(`${API_URL}/prospeccion/${userId}/${cardId}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) throw new Error('Failed to analyze card');
      const analyzedCard = await response.json();
      
      setCards(cards.map(card => 
        card.id === cardId ? { ...card, gpt_analysis: analyzedCard.analysis } : card
      ));
    } catch (err) {
      setError('Error analyzing with GPT');
      console.error(err);
    }
  };

  if (loading) return <div className="loading">Loading cards...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="prospeccion-container">
      <div className="prospeccion-header">
        <h2>Prospección</h2>
        <button onClick={addCard} className="add-card-btn">
          + Nueva Tarjeta
        </button>
      </div>
      
      <div className="cards-grid">
        {cards.map(card => (
          <div key={card.id} className="card">
            <div className="card-header">
              <span className="card-title">{card.title}</span>
              <button 
                onClick={() => analyzeWithGPT(card.id)}
                className="analyze-btn"
                disabled={!card.content}
              >
                Analizar con GPT
              </button>
            </div>
            <textarea
              className="card-editor"
              value={card.content || ''}
              onChange={(e) => handleTextChange(card.id, e.target.value)}
              placeholder="Escribe tu contenido aquí..."
            />
            {card.gpt_analysis && (
              <div className="analysis-section">
                <h4>Análisis GPT</h4>
                <div className="analysis-content">
                  {card.gpt_analysis}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Prospeccion; 