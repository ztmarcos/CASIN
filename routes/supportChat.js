const express = require('express');
const router = express.Router();
const openaiService = require('../services/openaiService');

// Support chat endpoint
router.post('/', async (req, res) => {
  try {
    const { message, conversationHistory = [] } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        error: 'Mensaje requerido'
      });
    }

    // Prepare messages for GPT API with enhanced context
    const messages = [
      // Add conversation history (increased from 4 to 8 messages)
      ...conversationHistory.slice(-8).map(msg => ({
        role: msg.type === 'user' ? 'user' : 'assistant',
        content: msg.content
      })),
      // Add current message
      {
        role: 'user',
        content: message
      }
    ];

    // Call OpenAI service
    const response = await openaiService.generateResponse(messages);

    res.json({
      response: response,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in support chat:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      response: 'Lo siento, hubo un error al procesar tu mensaje. Por favor, intenta de nuevo o contacta al equipo de soporte técnico.'
    });
  }
});

module.exports = router; 