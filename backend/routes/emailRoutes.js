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

// Report email endpoint
router.post('/report', async (req, res) => {
    try {
        const { policies, reportType } = req.body;
        
        if (!policies || !Array.isArray(policies) || policies.length === 0) {
            return res.status(400).json({ error: 'No policies provided' });
        }
        
        // Format policies data for email
        const policiesTable = policies.map(policy => `
            <tr>
                <td>${policy.tipo}</td>
                <td>${policy.numero_poliza}</td>
                <td>${policy.contratante}</td>
                <td>${policy.email || 'No disponible'}</td>
                <td>${policy.aseguradora}</td>
                <td>${policy.fecha_inicio}</td>
                <td>${policy.fecha_fin}</td>
                <td>$${policy.prima_total.toLocaleString()}</td>
                <td>${policy.forma_pago}</td>
                <td>${policy.status}</td>
            </tr>
        `).join('');

        const emailContent = `
            <h2>Reporte de ${reportType}</h2>
            <table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse;">
                <thead>
                    <tr>
                        <th>Tipo</th>
                        <th>Póliza</th>
                        <th>Contratante</th>
                        <th>Email</th>
                        <th>Aseguradora</th>
                        <th>Fecha Inicio</th>
                        <th>Fecha Fin</th>
                        <th>Prima Total</th>
                        <th>Forma de Pago</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${policiesTable}
                </tbody>
            </table>
        `;

        // Get unique emails from policies
        const recipientEmails = [...new Set(policies
            .map(policy => policy.email)
            .filter(email => email && email.includes('@')))];

        // Add default recipient if no valid emails found
        if (recipientEmails.length === 0) {
            recipientEmails.push(process.env.REPORT_EMAIL_RECIPIENT || process.env.EMAIL_RECIPIENT);
        }

        console.log('Sending email to:', recipientEmails);

        await emailService.sendReportEmail(
            recipientEmails.join(', '),
            `Reporte de ${reportType} - ${new Date().toLocaleDateString()}`,
            emailContent
        );

        res.json({ success: true, message: 'Report email sent successfully' });
    } catch (error) {
        console.error('Error sending report email:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router; 