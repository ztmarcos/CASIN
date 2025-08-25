// Load environment variables from .env file
require('dotenv').config({ path: './.env' });

console.log('🚀 Starting server with .env file loaded...');
console.log('📁 Current directory:', process.cwd());
console.log('🔑 OpenAI key detected:', process.env.OPENAI_API_KEY ? '✅ Found' : '❌ Missing');
console.log('🔑 VITE_OpenAI key detected:', process.env.VITE_OPENAI_API_KEY ? '✅ Found' : '❌ Missing');

if (process.env.OPENAI_API_KEY) {
    console.log('🔑 OpenAI key starts with:', process.env.OPENAI_API_KEY.slice(0, 20) + '...');
    console.log('🔑 OpenAI key ends with:', '...' + process.env.OPENAI_API_KEY.slice(-10));
} else {
    console.log('❌ No OPENAI_API_KEY found in .env');
}

if (process.env.VITE_OPENAI_API_KEY) {
    console.log('🔑 VITE OpenAI key starts with:', process.env.VITE_OPENAI_API_KEY.slice(0, 20) + '...');
    console.log('🔑 VITE OpenAI key ends with:', '...' + process.env.VITE_OPENAI_API_KEY.slice(-10));
} else {
    console.log('❌ No VITE_OPENAI_API_KEY found in .env');
}

// Force set the correct OpenAI API key if we detect your local one
if (process.env.VITE_OPENAI_API_KEY && process.env.VITE_OPENAI_API_KEY.startsWith('sk-proj-5eHUbtp3Kjkzf')) {
    console.log('🎯 Using your local OpenAI key from VITE_OPENAI_API_KEY');
    process.env.OPENAI_API_KEY = process.env.VITE_OPENAI_API_KEY;
}

console.log('💫 Final OpenAI key being used ends with:', process.env.OPENAI_API_KEY ? '...' + process.env.OPENAI_API_KEY.slice(-10) : 'None');

// Start the main server
require('./server-mysql.js'); 