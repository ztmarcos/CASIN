const express = require('express');
const router = express.Router();
const emailService = require('../services/email/emailService');

// Test connection
router.get('/test-connection', async (req, res) => {
    try {
        await emailService.verifyConnection();
        res.json({ success: true, message: 'Email connection verified successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Send test welcome email
router.post('/send-welcome', async (req, res) => {
    try {
        const testData = {
            clientName: req.body.clientName || 'Marcos Zavala',
            policyNumber: req.body.policyNumber || 'POL-2024-001',
            insuranceType: req.body.insuranceType || 'Seguro de Vida',
            startDate: req.body.startDate || '1 de Enero, 2024',
            coverage: req.body.coverage || '$1,000,000 MXN',
            insuranceCompany: req.body.insuranceCompany || 'Seguros Confianza',
            emergencyPhone: req.body.emergencyPhone || '800-123-4567',
            supportEmail: req.body.supportEmail || 'soporte@cambiandohistorias.com.mx',
            policyUrl: req.body.policyUrl || 'https://cambiandohistorias.com.mx/polizas/POL-2024-001',
            companyAddress: req.body.companyAddress || 'Av. Reforma 123, CDMX, México',
            companyName: req.body.companyName || 'Cambiando Historias',
            currentYear: new Date().getFullYear(),
            gptResponse: req.body.gptResponse || null
        };

        const result = await emailService.sendWelcomeEmail(
            req.body.to || 'ztmarcos@gmail.com',
            testData,
            req.body.account || 'operaciones'
        );

        res.json({ success: true, result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router; 