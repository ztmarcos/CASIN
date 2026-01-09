import { API_URL } from '../config/api.js';

const sendWelcomeEmail = async (gptResponse, data) => {
  try {
    const response = await fetch(`${API_URL}/email/send-welcome`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: data.email,
        gptResponse,
        ...data
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to send email');
    }

    const result = await response.json();
    console.log('Email sent successfully:', result);
    return result;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

const sendEmailWithGmail = async (to, subject, htmlContent, fromName = 'CASIN Seguros') => {
  try {
    const response = await fetch(`${API_URL}/email/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to,
        subject,
        htmlContent,
        from: import.meta.env.VITE_GMAIL_USERNAME || 'casinseguros@gmail.com',
        fromPass: import.meta.env.VITE_GMAIL_APP_PASSWORD,
        fromName
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to send email');
    }

    const result = await response.json();
    console.log('Email sent successfully with Gmail:', result);
    return result;
  } catch (error) {
    console.error('Error sending email with Gmail:', error);
    throw error;
  }
};

export { sendWelcomeEmail, sendEmailWithGmail }; 