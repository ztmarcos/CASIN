const sendWelcomeEmail = async (emailContent) => {
  try {
    const response = await fetch('http://localhost:3000/api/email/send-welcome', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: emailContent,
        from: 'empresas@cambiandohistorias.com.mx',
        to: 'ztmarcos@gmail.com',
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to send email');
    }

    const result = await response.json();
    console.log('Email sent successfully:', result);
    return result;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

export { sendWelcomeEmail }; 