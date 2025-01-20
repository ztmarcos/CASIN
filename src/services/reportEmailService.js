const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:30011';

const sendReportEmail = async (policies, reportType) => {
    try {
        const response = await fetch(`${API_URL}/api/email/report`, {
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