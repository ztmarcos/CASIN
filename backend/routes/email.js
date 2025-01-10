const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const emailConfig = require('../config/email');

const transporter = nodemailer.createTransport(emailConfig);

router.post('/send-welcome', async (req, res) => {
  try {
    const { content, to } = req.body;

    const mailOptions = {
      from: 'empresas@cambiandohistorias.com.mx',
      to: to,
      subject: 'Bienvenido a Cambiando Historias',
      text: content
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info);
    res.json(info);
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 