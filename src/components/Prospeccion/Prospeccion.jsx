import React, { useState, useEffect } from 'react';
import { API_URL } from '../../config/api.js';
import './Prospeccion.css';

const Prospeccion = () => {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedCard, setExpandedCard] = useState(null);
  const [editingTitle, setEditingTitle] = useState(null);
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
      const currentCard = cards.find(card => card.id === cardId);
      const response = await fetch(`${API_URL}/prospeccion/${userId}/${cardId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: currentCard.title,
          content: newContent
        }),
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

  const handleCardDoubleClick = (cardId) => {
    setExpandedCard(expandedCard === cardId ? null : cardId);
  };

  const handleTitleChange = async (cardId, newTitle) => {
    if (!newTitle.trim()) {
      setEditingTitle(null);
      return;
    }

    try {
      const currentCard = cards.find(card => card.id === cardId);
      const response = await fetch(`${API_URL}/prospeccion/${userId}/${cardId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: newTitle,
          content: currentCard?.content || ''
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update card title');
      }

      const updatedCard = await response.json();
      
      setCards(prevCards => prevCards.map(card => 
        card.id === cardId ? { ...card, ...updatedCard } : card
      ));

      // Forzar la actualización del estado
      await loadCards();
    } catch (err) {
      console.error('Error updating card title:', err);
      setError(`Error al actualizar título: ${err.message}`);
    } finally {
      setEditingTitle(null);
    }
  };

  const handleTitleKeyDown = async (e, cardId, currentTitle) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const newTitle = e.target.value.trim();
      if (newTitle && newTitle !== currentTitle) {
        await handleTitleChange(cardId, newTitle);
      }
      setEditingTitle(null);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setEditingTitle(null);
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
          <div 
            key={card.id} 
            className={`card ${expandedCard === card.id ? 'expanded' : ''}`}
            onDoubleClick={() => handleCardDoubleClick(card.id)}
          >
            <div className="card-header">
              {editingTitle === card.id ? (
                <input
                  type="text"
                  className="card-title-input"
                  defaultValue={card.title}
                  autoFocus
                  onBlur={async (e) => {
                    const newTitle = e.target.value.trim();
                    if (newTitle && newTitle !== card.title) {
                      await handleTitleChange(card.id, newTitle);
                    }
                    setEditingTitle(null);
                  }}
                  onKeyDown={(e) => handleTitleKeyDown(e, card.id, card.title)}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span 
                  className="card-title"
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setEditingTitle(card.id);
                  }}
                >
                  {card.title}
                </span>
              )}
              {card.gpt_analysis && (
                <span className="analysis-indicator" title="Análisis GPT disponible">
                  🤖
                </span>
              )}
            </div>
            <textarea
              className="card-editor"
              value={card.content || ''}
              onChange={(e) => handleTextChange(card.id, e.target.value)}
              placeholder="Escribe tu contenido aquí..."
              onClick={(e) => e.stopPropagation()}
            />
            {expandedCard === card.id && card.gpt_analysis && (
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