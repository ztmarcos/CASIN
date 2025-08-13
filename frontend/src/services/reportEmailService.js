import { API_URL } from '../config/api.js';

const API_BASE_URL = API_URL;

const sendReportEmail = async (policies, reportType) => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/email/report`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                policies,
                reportType
            }),
        });

        if (!response.ok) {
            throw new Error('Failed to send report email');
        }

        return await response.json();
    } catch (error) {
        console.error('Error sending report email:', error);
        throw error;
    }
};

const sendReportEmailWithGmail = async (policies, reportType, to, subject, htmlContent) => {
    try {
        const response = await fetch(`${API_BASE_URL}/email/send`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                to,
                subject,
                htmlContent,
                from: import.meta.env.VITE_GMAIL_USERNAME || 'casinseguros@gmail.com',
                fromPass: import.meta.env.VITE_GMAIL_APP_PASSWORD || 'espajcgariyhsboq',
                fromName: 'CASIN Seguros - Reportes',
                driveLinks: policies.map(policy => ({
                    name: `Poliza_${policy.id || policy.numero}`,
                    link: policy.driveLink || '#'
                })).filter(link => link.link !== '#')
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to send report email');
        }

        const result = await response.json();
        console.log('Report email sent successfully with Gmail:', result);
        return result;
    } catch (error) {
        console.error('Error sending report email with Gmail:', error);
        throw error;
    }
};

export { sendReportEmail, sendReportEmailWithGmail }; 