const express = require('express');
const router = express.Router();
const birthdayService = require('../services/birthdayService');

// Get all birthdays
router.get('/', async (req, res) => {
    try {
        const birthdays = await birthdayService.getAllBirthdays();
        res.json(birthdays);
    } catch (error) {
        console.error('Error getting birthdays:', error);
        res.status(500).json({ error: error.message });
    }
});

// Endpoint to manually trigger birthday checks
router.post('/check-and-send', async (req, res) => {
    try {
        const result = await birthdayService.checkAndSendBirthdayEmails();
        res.json(result);
    } catch (error) {
        console.error('Error in birthday route:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router; 