# Vercel Environment Variables Setup - Manual Method

If the automated script doesn't work, here's how to set up the essential variables manually:

## Essential Variables for CASIN CRM

### 1. Backend Variables (run from root directory)
```bash
# Firebase Configuration
vercel env add VITE_FIREBASE_API_KEY production
vercel env add VITE_FIREBASE_AUTH_DOMAIN production
vercel env add VITE_FIREBASE_PROJECT_ID production
vercel env add VITE_FIREBASE_STORAGE_BUCKET production
vercel env add VITE_FIREBASE_MESSAGING_SENDER_ID production
vercel env add VITE_FIREBASE_APP_ID production

# OpenAI
vercel env add OPENAI_API_KEY production
vercel env add VITE_OPENAI_API_KEY production

# Notion
vercel env add NOTION_API_KEY production
vercel env add VITE_NOTION_API_KEY production
vercel env add NOTION_DATABASE_ID production
vercel env add VITE_NOTION_DATABASE_ID production

# Google Drive
vercel env add GOOGLE_DRIVE_CLIENT_EMAIL production
vercel env add GOOGLE_DRIVE_PROJECT_ID production
vercel env add GOOGLE_DRIVE_PRIVATE_KEY production
vercel env add GOOGLE_DRIVE_FOLDER_ID production

# SMTP
vercel env add SMTP_HOST production
vercel env add SMTP_USER production
vercel env add SMTP_PASS production
```

### 2. Frontend Variables (run from frontend directory)
```bash
cd frontend

# Same variables for frontend
vercel env add VITE_FIREBASE_API_KEY production
vercel env add VITE_FIREBASE_AUTH_DOMAIN production
vercel env add VITE_FIREBASE_PROJECT_ID production
vercel env add VITE_FIREBASE_STORAGE_BUCKET production
vercel env add VITE_FIREBASE_MESSAGING_SENDER_ID production
vercel env add VITE_FIREBASE_APP_ID production

vercel env add VITE_OPENAI_API_KEY production
vercel env add VITE_NOTION_API_KEY production
vercel env add VITE_NOTION_DATABASE_ID production

# API URL for production
vercel env add VITE_API_URL production
# Value should be: https://casin-crm-backend-pxjm95h4m-ztmarcos-projects.vercel.app
```

## Alternative: Use Vercel Dashboard

1. Go to https://vercel.com/dashboard
2. Select your project (casin-crm-backend)
3. Go to Settings > Environment Variables
4. Add each variable manually with values from your .env file

## Security Notes

- Never commit .env files to git
- Use `.env.local` for local development
- Keep .env in .gitignore (it should already be there)
- Use the `--sensitive` flag for sensitive data 