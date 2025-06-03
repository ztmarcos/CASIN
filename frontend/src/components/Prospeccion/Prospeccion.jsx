import React, { useState, useEffect } from 'react';
import firebaseProspeccionService from '../../services/firebaseProspeccionService';
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
      setLoading(true);
      console.log('📋 Loading cards from Firebase...');
      
      const data = await firebaseProspeccionService.loadCards(userId);
      setCards(data);
      setError(null);
      
      console.log(`✅ Loaded ${data.length} cards from Firebase`);
    } catch (err) {
      console.error('❌ Error loading cards from Firebase:', err);
      setError('Error loading cards: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTextChange = async (cardId, newContent) => {
    try {
      console.log(`✏️ Updating card content: ${cardId}`);
      
      const updatedCard = await firebaseProspeccionService.updateCard(userId, cardId, {
        content: newContent
      });
      
      // Update local state
      setCards(prevCards => 
        prevCards.map(card => 
          card.id === cardId ? { ...card, content: newContent, updated_at: updatedCard.updated_at } : card
        )
      );
    } catch (err) {
      console.error('❌ Error updating card content:', err);
      setError('Error updating card: ' + err.message);
    }
  };

  const addCard = async () => {
    try {
      console.log('➕ Creating new card...');
      
      const newCard = await firebaseProspeccionService.createCard(userId, `Tarjeta ${cards.length + 1}`);
      
      setCards(prevCards => [newCard, ...prevCards]);
      setError(null);
      
      console.log('✅ New card created successfully');
    } catch (err) {
      console.error('❌ Error creating card:', err);
      setError('Error creating card: ' + err.message);
    }
  };

  const analyzeWithGPT = async (cardId) => {
    try {
      console.log(`🤖 Analyzing card with GPT: ${cardId}`);
      
      // For now, we'll add a mock analysis since GPT integration would need backend
      const mockAnalysis = `Análisis generado automáticamente para la tarjeta ${cardId} - ${new Date().toLocaleString()}`;
      
      await firebaseProspeccionService.addAnalysisToCard(userId, cardId, mockAnalysis);
      
      // Update local state
      setCards(prevCards =>
        prevCards.map(card => 
          card.id === cardId ? { ...card, gpt_analysis: mockAnalysis } : card
        )
      );
      
      console.log('✅ GPT analysis added successfully');
    } catch (err) {
      console.error('❌ Error analyzing with GPT:', err);
      setError('Error analyzing with GPT: ' + err.message);
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
      console.log(`✏️ Updating card title: ${cardId}`);
      
      const updatedCard = await firebaseProspeccionService.updateCard(userId, cardId, {
        title: newTitle
      });
      
      // Update local state
      setCards(prevCards => prevCards.map(card => 
        card.id === cardId ? { ...card, title: newTitle, updated_at: updatedCard.updated_at } : card
      ));

      setError(null);
      console.log('✅ Card title updated successfully');
    } catch (err) {
      console.error('❌ Error updating card title:', err);
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

  const handleDeleteCard = async (cardId) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar esta tarjeta?')) {
      return;
    }

    try {
      console.log(`🗑️ Deleting card: ${cardId}`);
      
      await firebaseProspeccionService.deleteCard(userId, cardId);
      
      // Update local state
      setCards(prevCards => prevCards.filter(card => card.id !== cardId));
      
      // Clear expanded card if it was the deleted one
      if (expandedCard === cardId) {
        setExpandedCard(null);
      }
      
      console.log('✅ Card deleted successfully');
    } catch (err) {
      console.error('❌ Error deleting card:', err);
      setError('Error deleting card: ' + err.message);
    }
  };

  if (loading) return <div className="loading">🔄 Loading cards from Firebase...</div>;
  if (error) return <div className="error">❌ {error}</div>;

  return (
    <div className="prospeccion-container">
      <div className="prospeccion-header">
        <h2>📋 Prospección (Firebase)</h2>
        <button onClick={addCard} className="add-card-btn">
          + Nueva Tarjeta
        </button>
      </div>
      
      {cards.length === 0 ? (
        <div className="empty-state">
          <p>No hay tarjetas creadas. ¡Crea tu primera tarjeta!</p>
        </div>
      ) : (
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
                
                <div className="card-actions">
                  {card.gpt_analysis && (
                    <span className="analysis-indicator" title="Análisis GPT disponible">
                      🤖
                    </span>
                  )}
                  <button 
                    className="analyze-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      analyzeWithGPT(card.id);
                    }}
                    title="Analizar con GPT"
                  >
                    🧠
                  </button>
                  <button 
                    className="delete-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteCard(card.id);
                    }}
                    title="Eliminar tarjeta"
                  >
                    🗑️
                  </button>
                </div>
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
                  <h4>🤖 Análisis GPT</h4>
                  <div className="analysis-content">
                    {card.gpt_analysis}
                  </div>
                </div>
              )}
              
              <div className="card-footer">
                <small className="card-timestamp">
                  {card.updated_at && `Actualizado: ${new Date(card.updated_at).toLocaleString()}`}
                </small>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Prospeccion; 