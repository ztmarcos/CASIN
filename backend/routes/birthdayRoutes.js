const express = require('express');
const router = express.Router();
const birthdayService = require('../services/birthdayService');
const emailService = require('../services/email/emailService');

// Test email configuration
router.post('/test-email', async (req, res) => {
    try {
        console.log('Testing email configuration...');
        await emailService.sendTestEmail();
        res.json({ success: true, message: 'Test email sent successfully' });
    } catch (error) {
        console.error('Email test failed:', error);
        res.status(500).json({ 
            error: 'Email test failed',
            details: error.message,
            code: error.code,
            response: error.response
        });
    }
});

// Get all birthdays
router.get('/', async (req, res) => {
    try {
        console.log('Fetching all birthdays...');
        const birthdays = await birthdayService.getAllBirthdays();
        console.log(`Successfully fetched ${birthdays.length} birthdays`);
        res.json(birthdays);
    } catch (error) {
        console.error('Error getting birthdays:', error);
        res.status(500).json({ error: error.message, stack: error.stack });
    }
});

// Endpoint to manually trigger birthday checks
router.post('/check-and-send', async (req, res) => {
    try {
        console.log('Starting birthday check and send process...');
        
        // First verify database connection
        const mysqlDatabase = require('../services/mysqlDatabase');
        await mysqlDatabase.getConnection();
        console.log('Database connection verified');
        
        // Then verify email service connection
        await emailService.verifyConnection();
        console.log('Email service connection verified');
        
        // Get available tables
        const tables = await mysqlDatabase.getTables();
        console.log('Available tables:', tables);
        
        // Then proceed with birthday emails
        const result = await birthdayService.checkAndSendBirthdayEmails();
        console.log('Birthday check and send completed:', result);
        res.json(result);
    } catch (error) {
        console.error('Detailed error in birthday route:', {
            message: error.message,
            stack: error.stack,
            cause: error.cause
        });
        res.status(500).json({ 
            error: error.message,
            details: error.stack,
            cause: error.cause
        });
    }
});

module.exports = router; 