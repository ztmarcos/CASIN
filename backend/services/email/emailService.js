const nodemailer = require('nodemailer');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

class EmailService {
    constructor() {
        // Gmail transporter
        this.transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.GMAIL_USER,
                pass: process.env.GMAIL_APP_PASSWORD
            }
        });
    }

    async sendWelcomeEmail(to, data) {
        try {
            console.log('\n=== Email Service: Starting Send Process ===');
            console.log('1. Received data:', {
                to,
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

            const mailOptions = {
                from: process.env.GMAIL_USER,
                to,
                subject: '¡Bienvenido a tu Plan de Seguros!',
                text
            };

            console.log('3. Sending mail with options:', {
                from: mailOptions.from,
                to,
                subject: mailOptions.subject,
                textLength: text.length
            });

            const result = await this.transporter.sendMail(mailOptions);
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
            console.log('Testing Gmail connection...');
            await this.transporter.verify();
            console.log('Gmail connection successful');
            return true;
        } catch (error) {
            console.error('Email connection verification failed:', error);
            throw error;
        }
    }
}

module.exports = new EmailService(); 