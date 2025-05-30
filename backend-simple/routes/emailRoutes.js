const express = require('express');
const router = express.Router();
const multer = require('multer');
const emailService = require('../services/email/emailService');

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 16 * 1024 * 1024 // 16MB limit
  }
});

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

// Detailed test email configuration
router.get('/test-detailed', async (req, res) => {
    try {
        console.log('Testing email configuration with detailed logging...');
        console.log('Environment variables:', {
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            user: process.env.SMTP_USER,
            // Not logging password for security
        });
        
        await emailService.sendTestEmail();
        res.json({ 
            success: true, 
            message: 'Email test successful',
            config: {
                host: process.env.SMTP_HOST,
                port: process.env.SMTP_PORT,
                user: process.env.SMTP_USER,
                secure: false
            }
        });
    } catch (error) {
        console.error('Detailed email test failed:', {
            message: error.message,
            code: error.code,
            command: error.command,
            response: error.response,
            stack: error.stack
        });
        res.status(500).json({ 
            error: 'Email test failed',
            details: {
                message: error.message,
                code: error.code,
                command: error.command,
                response: error.response
            }
        });
    }
});

// Send welcome email (with file attachments support)
router.post('/send-welcome', upload.array('attachment', 10), async (req, res) => {
    try {
        console.log('=== Send Welcome Email Request ===');
        console.log('Body keys:', Object.keys(req.body));
        console.log('Files:', req.files ? req.files.length : 0);
        
        // Extract data from FormData or JSON
        let to, gptResponse, subject, driveLinks, data;
        
        if (req.files && req.files.length > 0) {
            // FormData request with files
            to = req.body.to;
            gptResponse = req.body.gptResponse;
            subject = req.body.subject;
            driveLinks = req.body.driveLinks ? JSON.parse(req.body.driveLinks) : [];
            
            // Extract other data fields
            data = { ...req.body };
            delete data.to;
            delete data.gptResponse;
            delete data.subject;
            delete data.driveLinks;
        } else {
            // JSON request without files
            ({ to, gptResponse, subject, driveLinks = [], ...data } = req.body);
        }
        
        console.log('Sending welcome email to:', to);
        console.log('Email data:', { subject, dataKeys: Object.keys(data), attachments: req.files?.length || 0 });
        
        const result = await emailService.sendWelcomeEmail(to, { 
            gptResponse,
            subject,
            policyNumber: data.numero_poliza || data.poliza,
            coverage: data.cobertura,
            emergencyPhone: process.env.EMERGENCY_PHONE || '800-123-4567',
            supportEmail: process.env.SUPPORT_EMAIL || 'soporte@casinseguros.com.mx',
            companyName: process.env.COMPANY_NAME || 'CASIN Seguros',
            companyAddress: process.env.COMPANY_ADDRESS || 'Ciudad de México',
            driveLinks,
            attachments: req.files || []
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
                `;

                if (!policy.email) {
                    console.log(`No email address available for policy ${policy.numero_poliza}`);
                    return;
                }

                console.log(`Sending email for policy ${policy.numero_poliza} to ${policy.email}`);
                await emailService.sendReportEmail(
                    policy.email,
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