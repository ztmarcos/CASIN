const nodemailer = require('nodemailer');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

class EmailService {
    constructor() {
        console.log('Initializing email service...');
        
        // Check if we have the required environment variables
        if (!process.env.SMTP_USER || !process.env.SMTP_PASS || !process.env.SMTP_HOST || !process.env.SMTP_PORT) {
            console.error('SMTP configuration is missing!');
            throw new Error('Email configuration is not complete');
        }

        // Remove any spaces from the password
        const password = process.env.SMTP_PASS.replace(/\s+/g, '');
        
        // SMTP transporter configuration
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT),
            secure: false, // false for port 587 (TLS)
            auth: {
                user: process.env.SMTP_USER,
                pass: password
            },
            debug: true,
            logger: true,
            tls: {
                rejectUnauthorized: false
            },
            envelope: {
                from: `"CASIN Seguros" <${process.env.SMTP_USER}>`,
            },
            dkim: {
                domainName: 'gmail.com',
                keySelector: 'default',
                privateKey: '...'
            }
        });

        console.log('Email transporter created with configuration:', {
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            secure: false,
            user: process.env.SMTP_USER
        });

        // Verify connection on startup
        this.verifyConnection();
    }

    async verifyConnection() {
        try {
            console.log('Verifying email service connection...');
            console.log('Using configuration:', {
                host: process.env.SMTP_HOST,
                port: process.env.SMTP_PORT,
                user: process.env.SMTP_USER,
                secure: false,
                tls: {
                    rejectUnauthorized: false
                }
            });
            
            const result = await this.transporter.verify();
            console.log('Email service connection verified successfully:', result);
            return true;
        } catch (error) {
            console.error('Email service connection failed:', {
                error: error.message,
                code: error.code,
                command: error.command,
                response: error.response,
                responseCode: error.responseCode,
                stack: error.stack
            });
            
            // Provide more specific error messages
            if (error.code === 'EAUTH') {
                console.error('Authentication failed. This could be because:');
                console.error('1. The password might be incorrect');
                console.error('2. 2-Step Verification might require an App Password');
                console.error('3. Less secure app access might be disabled');
            } else if (error.code === 'ESOCKET') {
                console.error('Connection failed. This could be because:');
                console.error('1. The SMTP host or port might be incorrect');
                console.error('2. A firewall might be blocking the connection');
            }
            
            throw new Error(`Email verification failed: ${error.message}`);
        }
    }

    async sendWelcomeEmail(to, data) {
        try {
            console.log('\n=== Email Service: Starting Send Process ===');
            console.log('1. Received data:', {
                to,
                gptResponseLength: data.gptResponse ? data.gptResponse.length : 0,
                hasGptResponse: !!data.gptResponse,
                attachments: data.attachments ? data.attachments.length : 0,
                driveLinks: data.driveLinks ? data.driveLinks.length : 0
            });
            
            // Create base email content
            let emailContent = `${data.gptResponse || 'No hay contenido disponible'}

Información de tu póliza:
- Número de póliza: ${data.policyNumber}
- Cobertura: ${data.coverage}

Para asistencia:
- Teléfono: ${data.emergencyPhone}
- Email: ${data.supportEmail}`;

            // Add Drive links if any
            if (data.driveLinks && data.driveLinks.length > 0) {
                emailContent += '\n\nArchivos adjuntos en Google Drive:\n';
                data.driveLinks.forEach(link => {
                    emailContent += `- ${link.name}: ${link.link}\n`;
                });
            }

            emailContent += `\n© ${new Date().getFullYear()} ${data.companyName}
${data.companyAddress}`;

            console.log('2. Email content preview:', {
                length: emailContent.length,
                sample: emailContent.substring(0, 200) + '...'
            });

            const mailOptions = {
                from: {
                    name: 'CASIN Seguros',
                    address: process.env.SMTP_USER
                },
                to,
                subject: data.subject || '¡Bienvenido a tu Plan de Seguros!',
                text: emailContent
            };

            // Add attachments if any
            if (data.attachments && data.attachments.length > 0) {
                mailOptions.attachments = data.attachments.map(file => ({
                    filename: file.originalname,
                    content: file.buffer,
                    contentType: file.mimetype
                }));
                console.log('3. Adding attachments:', data.attachments.map(f => f.originalname));
            }

            console.log('4. Sending mail with options:', {
                from: mailOptions.from,
                to,
                subject: mailOptions.subject,
                textLength: emailContent.length,
                attachmentCount: mailOptions.attachments ? mailOptions.attachments.length : 0
            });

            const result = await this.transporter.sendMail(mailOptions);
            console.log('5. Email sent successfully:', result);
            console.log('=== Email Service: Process Complete ===\n');
            return { success: true, messageId: result.messageId };
        } catch (error) {
            console.error('Email service: Error sending email:', error);
            throw error;
        }
    }

    // Helper function to convert text to proper case
    toProperCase(text) {
        if (!text) return '';
        
        // Split by any whitespace and handle multiple spaces
        const words = text.trim().split(/\s+/);
        
        return words
            .map(word => {
                // Skip empty words
                if (!word) return '';
                // Convert word to lowercase first
                word = word.toLowerCase();
                // Capitalize first letter
                return word.charAt(0).toUpperCase() + word.slice(1);
            })
            .filter(Boolean) // Remove any empty strings
            .join(' ');
    }

    async sendBirthdayEmail(to, data) {
        try {
            console.log('\n=== Email Service: Sending Birthday Email ===');
            console.log('Recipient:', to);
            
            // Validate email address
            if (!to || typeof to !== 'string' || !to.includes('@')) {
                throw new Error(`Invalid email address: ${to}`);
            }

            // Convert name to proper case
            const properName = this.toProperCase(data.nombre);
            console.log('Name converted to proper case:', properName);

            const text = `
¡Feliz Cumpleaños ${properName}!

En este día tan especial, queremos desearte un muy feliz cumpleaños.
Gracias por confiar en nosotros para proteger lo que más te importa.

Que este nuevo año de vida esté lleno de bendiciones y éxitos.

Atentamente,
El equipo de CASIN Seguros
${data.companyAddress}`;

            const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="x-apple-disable-message-reformatting">
    <title>¡Feliz Cumpleaños!</title>
</head>
<body>
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>¡Feliz Cumpleaños ${properName}!</h2>
        <p>En este día tan especial, queremos desearte un muy feliz cumpleaños.</p>
        <p>Gracias por confiar en nosotros para proteger lo que más te importa.</p>
        <p>Que este nuevo año de vida esté lleno de bendiciones y éxitos.</p>
        <p style="color: #666;">Atentamente,<br>
        <strong>El equipo de CASIN Seguros</strong><br>
        ${data.companyAddress}</p>
    </div>
</body>
</html>`;

            const mailOptions = {
                from: {
                    name: 'CASIN Seguros',
                    address: process.env.SMTP_USER
                },
                sender: 'CASIN Seguros',
                replyTo: {
                    name: 'CASIN Seguros',
                    address: process.env.SMTP_USER
                },
                to: to.trim().toLowerCase(),
                subject: '¡Feliz Cumpleaños!',
                text,
                html,
                headers: {
                    'X-Priority': '1',
                    'X-MSMail-Priority': 'High',
                    'Importance': 'high',
                    'X-Organization': 'CASIN Seguros',
                    'Organization': 'CASIN Seguros',
                    'X-Mailer': 'CASIN Seguros Mailer',
                    'From': `"CASIN Seguros" <${process.env.SMTP_USER}>`
                }
            };

            console.log('Attempting to send email with options:', {
                from: mailOptions.from,
                to: mailOptions.to,
                subject: mailOptions.subject
            });

            const result = await this.transporter.sendMail(mailOptions);
            console.log('Birthday email sent successfully:', {
                messageId: result.messageId,
                response: result.response
            });
            return { success: true, messageId: result.messageId };
        } catch (error) {
            console.error('Email service: Error sending birthday email:', {
                error: error.message,
                code: error.code,
                command: error.command,
                response: error.response,
                stack: error.stack
            });
            throw error;
        }
    }

    async sendReportEmail(to, subject, html) {
        try {
            console.log('\n=== Email Service: Sending Report Email ===');
            console.log('Sending to:', to);
            
            const mailOptions = {
                from: {
                    name: 'CASIN Seguros',
                    address: process.env.SMTP_USER
                },
                to,
                subject,
                html
            };

            const result = await this.transporter.sendMail(mailOptions);
            console.log('Report email sent successfully:', result);
            return { success: true, messageId: result.messageId };
        } catch (error) {
            console.error('Email service: Error sending report email:', error);
            throw error;
        }
    }

    // Generic email sending method
    async sendEmail({ to, subject, html, text }) {
        try {
            console.log('\n=== Email Service: Sending Generic Email ===');
            console.log('Sending to:', to);
            
            const mailOptions = {
                from: {
                    name: 'CASIN Seguros',
                    address: process.env.SMTP_USER
                },
                to,
                subject,
                ...(html && { html }),
                ...(text && { text })
            };

            const result = await this.transporter.sendMail(mailOptions);
            console.log('Generic email sent successfully:', result);
            return { success: true, messageId: result.messageId };
        } catch (error) {
            console.error('Email service: Error sending generic email:', error);
            throw error;
        }
    }

    // Test function to send a simple test email
    async sendTestEmail() {
        try {
            console.log('Sending test email...');
            const result = await this.transporter.sendMail({
                from: {
                    name: 'CASIN Seguros',
                    address: process.env.SMTP_USER
                },
                to: process.env.SMTP_USER, // Send to self for testing
                subject: 'Test Email',
                text: 'If you receive this email, the configuration is working correctly.'
            });
            console.log('Test email sent successfully:', result);
            return { success: true, messageId: result.messageId };
        } catch (error) {
            console.error('Failed to send test email:', {
                error: error.message,
                code: error.code,
                command: error.command,
                response: error.response
            });
            throw error;
        }
    }
}

module.exports = new EmailService(); 