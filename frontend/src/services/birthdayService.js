import { API_URL } from '../config/api.js';

const API_BASE_URL = API_URL;

export const fetchBirthdays = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/birthday`);
    if (!response.ok) {
      throw new Error('Failed to fetch birthdays');
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching birthdays:', error);
    return [];
  }
};

export const sendBirthdayEmail = async (birthdayPerson, message = '') => {
  try {
    const response = await fetch(`${API_BASE_URL}/email/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: birthdayPerson.email,
        subject: `¡Feliz Cumpleaños ${birthdayPerson.nombre}! 🎉`,
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #e74c3c; text-align: center;">🎂 ¡Feliz Cumpleaños! 🎂</h2>
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 15px; color: white; text-align: center;">
              <h3 style="margin: 0; font-size: 24px;">${birthdayPerson.nombre}</h3>
              <p style="font-size: 18px; margin: 20px 0;">¡Que tengas un día maravilloso lleno de alegría y éxito!</p>
              ${message ? `<p style="font-style: italic; margin: 20px 0;">"${message}"</p>` : ''}
              <div style="margin: 30px 0;">
                <span style="font-size: 40px;">🎉 🎈 🎁</span>
              </div>
              <p style="font-size: 16px; margin: 0;">Con cariño,<br><strong>Equipo CASIN Seguros</strong></p>
            </div>
            <div style="text-align: center; margin-top: 20px; color: #7f8c8d;">
              <p>Este mensaje fue enviado automáticamente por el sistema de CASIN Seguros</p>
            </div>
          </div>
        `,
        from: import.meta.env.VITE_GMAIL_USERNAME || 'casinseguros@gmail.com',
        fromPass: import.meta.env.VITE_GMAIL_APP_PASSWORD || 'espajcgariyhsboq',
        fromName: 'CASIN Seguros - Felicitaciones'
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to send birthday email');
    }

    const result = await response.json();
    console.log('Birthday email sent successfully:', result);
    return result;
  } catch (error) {
    console.error('Error sending birthday email:', error);
    throw error;
  }
}; 