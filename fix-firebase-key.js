// Script to fix Firebase private key format
// The key should be a proper PEM format

const correctPrivateKey = `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDI3wH4oZYqKdPY
XrO6cq7r7UJM8+4ZuH4Y2YpYr6X9YXHJj4wJMf3X9bCk5cX7yD8uGZFjVxF4z1P
[... more key content ...]
-----END PRIVATE KEY-----`;

console.log('Firebase private key should be in this format:');
console.log('1. Complete PEM format with headers/footers');
console.log('2. All newlines should be escaped as \\n in environment variables');
console.log('3. No extra quotes or characters');

// The key from Firebase service account JSON should be used directly
console.log('\nTo fix: Copy the private_key field from Firebase service account JSON to Vercel env'); 