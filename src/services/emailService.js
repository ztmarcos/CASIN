const sendWelcomeEmail = async (gptResponse, data) => {
  try {
    const response = await fetch('http://localhost:3001/api/email/send-welcome', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: 'ztmarcos@gmail.com',
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

export { sendWelcomeEmail }; 