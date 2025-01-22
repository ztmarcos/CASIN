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
        const { to, gptResponse, subject, ...data } = req.body;
        
        console.log('Sending welcome email to:', to);
        console.log('Email data:', { subject, dataKeys: Object.keys(data) });
        
        const result = await emailService.sendWelcomeEmail(to, { 
            gptResponse,
            subject,
            policyNumber: data.numero_poliza || data.poliza,
            coverage: data.cobertura,
            emergencyPhone: process.env.EMERGENCY_PHONE || '800-123-4567',
            supportEmail: process.env.SUPPORT_EMAIL || 'soporte@cambiandohistorias.com.mx',
            companyName: process.env.COMPANY_NAME || 'Cambiando Historias',
            companyAddress: process.env.COMPANY_ADDRESS || 'Ciudad de México'
        });
        
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

        console.log('Received policies for email:', policies.map(p => ({
            numero_poliza: p.numero_poliza,
            fecha_fin: p.fecha_fin,
            email: p.email
        })));
        
        // Send individual emails to each policy holder
        const emailPromises = policies.map(async (policy) => {
            try {
                // Temporarily override email to ztmarcos@gmail.com for testing
                const testEmail = 'ztmarcos@gmail.com';
                
                const emailContent = `
                    <h2>Recordatorio de ${reportType}</h2>
                    <p>Estimado/a ${policy.contratante},</p>
                    <p>Le recordamos que tiene un ${reportType === 'Vencimientos' ? 'vencimiento' : 'pago parcial'} próximo:</p>
                    <ul>
                        <li><strong>Póliza:</strong> ${policy.numero_poliza}</li>
                        <li><strong>Tipo:</strong> ${policy.tipo}</li>
                        <li><strong>Aseguradora:</strong> ${policy.aseguradora}</li>
                        ${reportType === 'Vencimientos' 
                            ? `<li><strong>Fecha de Vencimiento:</strong> ${policy.fecha_fin}</li>
                               <li><strong>Monto Total:</strong> $${policy.prima_total ? policy.prima_total.toLocaleString() : '0'}</li>`
                            : `<li><strong>Pago Parcial:</strong> $${(policy.pago_parcial || 0).toLocaleString()}</li>
                               <li><strong>Forma de Pago:</strong> ${policy.forma_pago || 'No especificada'}</li>`
                        }
                    </ul>
                    <p>Por favor, póngase en contacto con nosotros para más información.</p>
                    <p><small>Email original destinado a: ${policy.email || 'No disponible'}</small></p>
                `;

                console.log(`Sending email for policy ${policy.numero_poliza} to ${testEmail}`);
                await emailService.sendReportEmail(
                    testEmail,
                    `Recordatorio de ${reportType} - Póliza ${policy.numero_poliza}`,
                    emailContent
                );
                console.log(`Email sent successfully for policy ${policy.numero_poliza}`);
            } catch (error) {
                console.error(`Error sending email for policy ${policy.numero_poliza}:`, error);
                throw error;
            }
        });

        await Promise.all(emailPromises);
        console.log('All reminder emails sent successfully');
        res.json({ success: true, message: 'Reminder emails sent successfully' });
    } catch (error) {
        console.error('Error sending reminder emails:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router; 