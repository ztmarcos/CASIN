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

export { sendReportEmail }; 