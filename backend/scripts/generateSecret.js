const crypto = require('crypto');

const generateSecret = () => {
  const secret = crypto.randomBytes(64).toString('hex');
  console.log('\nCopy this secret to your .env file:\n');
  console.log('JWT_SECRET=' + secret + '\n');
};

generateSecret(); 