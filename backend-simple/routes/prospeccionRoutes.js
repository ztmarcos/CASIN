const express = require('express');
const router = express.Router();
const prospeccionService = require('../services/prospeccionService');

// Get all cards for a user
router.get('/:userId', async (req, res) => {
  try {
    const cards = await prospeccionService.getCards(req.params.userId);
    res.json(cards);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new card
router.post('/:userId', async (req, res) => {
  try {
    const card = await prospeccionService.createCard(
      req.params.userId,
      req.body.title
    );
    res.status(201).json(card);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update a card
router.put('/:userId/:cardId', async (req, res) => {
  try {
    const card = await prospeccionService.updateCard(
      req.params.cardId,
      req.params.userId,
      {
        title: req.body.title,
        content: req.body.content
      }
    );
    res.json(card);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a card
router.delete('/:userId/:cardId', async (req, res) => {
  try {
    const card = await prospeccionService.deleteCard(
      req.params.cardId,
      req.params.userId
    );
    res.json(card);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Analyze card with GPT
router.post('/:userId/:cardId/analyze', async (req, res) => {
  try {
    const analysis = await prospeccionService.analyzeWithGPT(
      req.params.cardId,
      req.params.userId
    );
    res.json(analysis);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 