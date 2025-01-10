const emailConfig = {
  host: 'smtpout.secureserver.net',
  port: 465,
  secure: true,
  auth: {
    user: 'empresas@cambiandohistorias.com.mx',
    pass: 'V_Fo9E5HiBldRaw'
  },
  tls: {
    rejectUnauthorized: false
  }
};

module.exports = emailConfig; 