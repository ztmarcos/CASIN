const express = require('express');
const router = express.Router();
const emailService = require('../services/email/emailService');

// Test email connection
router.get('/test-connection', async (req, res) => {
    try {
        await emailService.verifyConnection();
        res.json({ 
            success: true, 
            message: 'Email connection verified successfully',
            operacionesUser: process.env.EMAIL_OPERACIONES_USER,
            empresasUser: process.env.EMAIL_EMPRESAS_USER
        });
    } catch (error) {
        console.error('Email connection test failed:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message,
            details: error.toString()
        });
    }
});

// Send welcome email
router.post('/send-welcome', async (req, res) => {
    try {
        const { to, gptResponse, ...data } = req.body;
        const result = await emailService.sendWelcomeEmail(to, { gptResponse, ...data });
        res.json(result);
    } catch (error) {
        console.error('Error sending welcome email:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router; 