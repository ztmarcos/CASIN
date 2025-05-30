require('dotenv').config();
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

class NewsletterService {
    constructor() {
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: process.env.SMTP_PORT || 587,
            secure: false, // true for 465, false for other ports
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });
    }

    // Format plain text with ANSI colors and styling
    formatNewsletterText(content) {
        // ANSI color codes
        const colors = {
            reset: '\x1b[0m',
            bright: '\x1b[1m',
            dim: '\x1b[2m',
            red: '\x1b[31m',
            green: '\x1b[32m',
            yellow: '\x1b[33m',
            blue: '\x1b[34m',
            magenta: '\x1b[35m',
            cyan: '\x1b[36m',
            white: '\x1b[37m',
            bgBlue: '\x1b[44m',
            bgGreen: '\x1b[42m'
        };

        // HTML version for better email support
        const htmlContent = this.formatNewsletterHTML(content);
        
        // Plain text version with basic formatting
        const textContent = content
            .replace(/\*\*(.*?)\*\*/g, '$1')  // Remove bold markers
            .replace(/\*(.*?)\*/g, '$1')      // Remove italic markers
            .replace(/#{1,6}\s*(.*)/g, '>>> $1 <<<')  // Headers
            .replace(/---+/g, '=' .repeat(50));       // Horizontal rules

        return {
            text: textContent,
            html: htmlContent
        };
    }

    // Format content as HTML for better email support
    formatNewsletterHTML(content) {
        let html = content
            // Headers
            .replace(/^### (.*$)/gm, '<h3 style="color: #2563eb; font-weight: bold; margin: 20px 0 10px 0; font-size: 18px;">$1</h3>')
            .replace(/^## (.*$)/gm, '<h2 style="color: #1d4ed8; font-weight: bold; margin: 25px 0 15px 0; font-size: 22px;">$1</h2>')
            .replace(/^# (.*$)/gm, '<h1 style="color: #1e3a8a; font-weight: bold; margin: 30px 0 20px 0; font-size: 26px; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">$1</h1>')
            
            // Bold and italic
            .replace(/\*\*(.*?)\*\*/g, '<strong style="color: #1f2937; font-weight: bold;">$1</strong>')
            .replace(/\*(.*?)\*/g, '<em style="color: #374151; font-style: italic;">$1</em>')
            
            // Lists
            .replace(/^- (.*$)/gm, '<li style="margin: 5px 0; color: #4b5563;">$1</li>')
            .replace(/^(\d+)\. (.*$)/gm, '<li style="margin: 5px 0; color: #4b5563;">$2</li>')
            
            // Horizontal rules
            .replace(/---+/g, '<hr style="border: none; border-top: 2px solid #e5e7eb; margin: 20px 0;">')
            
            // Line breaks
            .replace(/\n\n/g, '</p><p style="margin: 15px 0; color: #374151; line-height: 1.6;">')
            .replace(/\n/g, '<br>');

        // Detect content type for appropriate header
        const isHealthContent = content.includes('salud') || content.includes('Salud') || 
                               content.includes('COVID') || content.includes('miasis') ||
                               content.includes('vacun') || content.includes('UNICEF');
        
        const headerTitle = isHealthContent ? '⚕️ Newsletter de Salud CASIN' : '📧 CASIN Newsletter';
        const headerSubtitle = isHealthContent ? 'Información actualizada de salud pública' : 'Latest updates and information';

        // Wrap in paragraphs and add email container
        html = `
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; line-height: 1.6; color: #374151;">
            <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 30px; text-align: center; margin-bottom: 30px;">
                <h1 style="color: white; margin: 0; font-size: 28px; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">${headerTitle}</h1>
                <p style="color: #dbeafe; margin: 10px 0 0 0; font-size: 16px;">${headerSubtitle}</p>
            </div>
            <div style="padding: 0 20px;">
                <p style="margin: 15px 0; color: #374151; line-height: 1.6;">${html}</p>
            </div>
            <div style="background: #f9fafb; padding: 20px; margin-top: 30px; border-top: 2px solid #e5e7eb; text-align: center;">
                <p style="color: #6b7280; font-size: 14px; margin: 0;">
                    📧 Sent from CASIN Database System<br>
                    <span style="color: #9ca3af;">Generated on ${new Date().toLocaleDateString()}</span>
                </p>
            </div>
        </div>`;

        return html;
    }

    async sendNewsletter(content, recipients, subject = '📧 CASIN Newsletter Update') {
        try {
            const formattedContent = this.formatNewsletterText(content);
            
            // Prepare email options
            const mailOptions = {
                from: `"CASIN Newsletter" <${process.env.SMTP_USER}>`,
                to: Array.isArray(recipients) ? recipients.join(', ') : recipients,
                subject: subject,
                text: formattedContent.text,
                html: formattedContent.html
            };

            // Send email
            const info = await this.transporter.sendMail(mailOptions);
            
            console.log('\n✅ Newsletter sent successfully!');
            console.log('📧 Message ID:', info.messageId);
            console.log('📬 Recipients:', mailOptions.to);
            console.log('📝 Subject:', subject);
            
            return {
                success: true,
                messageId: info.messageId,
                recipients: mailOptions.to
            };

        } catch (error) {
            console.error('❌ Error sending newsletter:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async sendTestNewsletter(content) {
        const testEmail = process.env.TEST_EMAIL || 'marcoszavala09@gmail.com';
        console.log(`\n🧪 Sending test newsletter to: ${testEmail}`);
        
        // Detect if it's health content and adjust subject
        const isHealthContent = content.includes('salud') || content.includes('Salud') || 
                               content.includes('COVID') || content.includes('miasis') ||
                               content.includes('vacun') || content.includes('UNICEF');
        
        const subject = isHealthContent ? 
            '⚕️ Newsletter de Salud CASIN' : 
            '🧪 CASIN Newsletter';
        
        return await this.sendNewsletter(
            content, 
            testEmail, 
            subject
        );
    }

    // Verify email configuration
    async verifyConnection() {
        try {
            await this.transporter.verify();
            console.log('✅ Email server connection verified!');
            return true;
        } catch (error) {
            console.error('❌ Email server connection failed:', error.message);
            console.log('\n📋 Please check your .env file configuration:');
            console.log('SMTP_USER=casindb46@gmail.com');
            console.log('SMTP_PASS=your_gmail_app_password');
            console.log('SMTP_HOST=smtp.gmail.com');
            console.log('SMTP_PORT=587');
            console.log('TEST_EMAIL=marcoszavala09@gmail.com');
            return false;
        }
    }
}
   

// Main function to run the newsletter
async function runNewsletter() {
    console.log('🚀 Starting CASIN Newsletter Service...\n');
    
    const newsletter = new NewsletterService();
    
    // Verify email connection first
    const isConnected = await newsletter.verifyConnection();
    if (!isConnected) {
        process.exit(1);
    }

    // Read newsletter content
    let content = '';
    const newsletterPath = path.join(__dirname, 'docs', 'newsletter1');
    
    try {
        if (fs.existsSync(newsletterPath)) {
            content = fs.readFileSync(newsletterPath, 'utf8').trim();
        }
        
        if (!content) {
            console.error('❌ Newsletter content is empty. Please add content to docs/newsletter1');
            process.exit(1);
        }
    } catch (error) {
        console.error('❌ Error reading newsletter content:', error.message);
        process.exit(1);
    }

    console.log('📄 Newsletter content loaded successfully');
    console.log('📝 Content preview:');
    console.log('─'.repeat(50));
    console.log(content.substring(0, 200) + '...');
    console.log('─'.repeat(50));

    // Send test newsletter
    const result = await newsletter.sendTestNewsletter(content);
    
    if (result.success) {
        console.log('\n🎉 Test newsletter sent successfully!');
        console.log('💡 Check your email to verify the formatting');
        console.log('\n📋 To send to multiple recipients, modify the script or use:');
        console.log('   newsletter.sendNewsletter(content, ["email1@domain.com", "email2@domain.com"])');
    } else {
        console.log('\n❌ Failed to send test newsletter');
        console.log('Error:', result.error);
    }
}

// Export for use in other modules
module.exports = { NewsletterService };

// Run if called directly
if (require.main === module) {
    runNewsletter().catch(console.error);
} 