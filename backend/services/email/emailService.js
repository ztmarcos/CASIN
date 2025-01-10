const nodemailer = require('nodemailer');
const fs = require('fs').promises;
const path = require('path');

class EmailService {
    constructor() {
        // Create transporter for operaciones account
        this.operacionesTransporter = nodemailer.createTransport({
            host: 'smtpout.secureserver.net',
            port: 465,
            secure: true,
            auth: {
                user: 'operaciones@cambiandohistorias.com.mx',
                pass: 'we2l4U-hl9lylHl'
            }
        });

        // Create transporter for empresas account
        this.empresasTransporter = nodemailer.createTransport({
            host: 'smtpout.secureserver.net',
            port: 465,
            secure: true,
            auth: {
                user: 'empresas@cambiandohistorias.com.mx',
                pass: 'V_Fo9E5HiBldRaw'
            }
        });
    }

    async sendWelcomeEmail(to, data, account = 'operaciones') {
        try {
            console.log('\n=== Email Service: Starting Send Process ===');
            console.log('1. Received data:', {
                to,
                account,
                gptResponseLength: data.gptResponse ? data.gptResponse.length : 0,
                hasGptResponse: !!data.gptResponse
            });
            
            // Create plain text email content
            const text = `
¡Bienvenido a tu Plan de Seguros!

${data.gptResponse || 'No hay contenido disponible'}

Información de tu póliza:
- Número de póliza: ${data.policyNumber}
- Cobertura: ${data.coverage}

Para asistencia:
- Teléfono: ${data.emergencyPhone}
- Email: ${data.supportEmail}

© ${new Date().getFullYear()} ${data.companyName}
${data.companyAddress}`;

            console.log('2. Email content preview:', {
                length: text.length,
                sample: text.substring(0, 200) + '...'
            });
            
            const transporter = account === 'operaciones' 
                ? this.operacionesTransporter 
                : this.empresasTransporter;

            const from = account === 'operaciones'
                ? 'operaciones@cambiandohistorias.com.mx'
                : 'empresas@cambiandohistorias.com.mx';

            const mailOptions = {
                from,
                to,
                subject: '¡Bienvenido a tu Plan de Seguros!',
                text
            };

            console.log('3. Sending mail with options:', {
                from,
                to,
                subject: mailOptions.subject,
                textLength: text.length
            });

            const result = await transporter.sendMail(mailOptions);
            console.log('4. Email sent successfully:', result);
            console.log('=== Email Service: Process Complete ===\n');
            return { success: true, messageId: result.messageId };
        } catch (error) {
            console.error('Email service: Error sending email:', error);
            throw error;
        }
    }

    // Method to verify email connection
    async verifyConnection() {
        try {
            await this.operacionesTransporter.verify();
            await this.empresasTransporter.verify();
            return true;
        } catch (error) {
            console.error('Email connection verification failed:', error);
            throw error;
        }
    }
}

module.exports = new EmailService(); 