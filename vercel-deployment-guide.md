# CASIN CRM Vercel Deployment Guide

## 🚀 Why Vercel?
- **Free tier** with generous limits
- **Automatic deployments** from Git
- **Built-in CDN** for fast global access
- **Excellent React/Vite support**
- **Environment variables** management
- **Serverless functions** for backend

## 📋 Prerequisites
1. GitHub account with your code
2. Vercel account (free at vercel.com)
3. Database solution (we'll use PlanetScale or Neon)

## 🗄️ Database Options for Production

### Option A: PlanetScale (Recommended)
```bash
# 1. Sign up at planetscale.com
# 2. Create new database: casin-crm
# 3. Get connection string from dashboard
```

### Option B: Neon (PostgreSQL)
```bash
# 1. Sign up at neon.tech
# 2. Create database
# 3. Get connection string
```

### Option C: Railway MySQL (Keep current setup)
```bash
# 1. Use your existing Railway MySQL
# 2. Keep current connection details
```

## 🔧 Backend Deployment Steps

### 1. Prepare Backend for Vercel
Your backend is already configured with:
- ✅ `vercel.json` configuration
- ✅ `server-mysql.js` entry point
- ✅ Environment variables support

### 2. Deploy Backend to Vercel
```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy backend (from root directory)
vercel

# Follow prompts:
# - Project name: casin-crm-backend
# - Framework: Other
# - Build command: npm run build
# - Output directory: . (current directory)
```

### 3. Set Environment Variables in Vercel
In Vercel dashboard → Project → Settings → Environment Variables:

**Database Variables:**
```
DB_HOST=your-db-host
DB_USER=your-db-user
DB_PASSWORD=your-db-password
DB_NAME=your-db-name
DB_PORT=3306
```

**API Keys:**
```
OPENAI_API_KEY=sk-proj-BO...
NOTION_API_KEY=ntn_151189...
NOTION_DATABASE_ID=1f7385297f...
GOOGLE_DRIVE_CLIENT_EMAIL=pdfcasin@...
GOOGLE_DRIVE_PROJECT_ID=pdfcasin
GOOGLE_DRIVE_PRIVATE_KEY=-----BEGIN...
GOOGLE_DRIVE_FOLDER_ID=1rDGEXJg-8...
SMTP_HOST=smtp.gmail.com
SMTP_USER=casindb46@...
SMTP_PASS=your-smtp-password
```

**Other Variables:**
```
NODE_ENV=production
```

## 🎨 Frontend Deployment Steps

### 1. Update API Configuration
Update `frontend/src/config/api.js` with your backend URL:
```javascript
const API_BASE_URL = isDevelopment 
  ? '' 
  : 'https://your-backend-app.vercel.app';
```

### 2. Deploy Frontend to Vercel
```bash
# Navigate to frontend directory
cd frontend

# Deploy frontend
vercel

# Follow prompts:
# - Project name: casin-crm-frontend
# - Framework: Vite
```

### 3. Set Frontend Environment Variables
In Vercel dashboard → Frontend Project → Settings → Environment Variables:
```
VITE_API_URL=https://your-backend-app.vercel.app
VITE_OPENAI_API_KEY=sk-proj-BO...
VITE_NOTION_API_KEY=ntn_151189...
VITE_NOTION_DATABASE_ID=1f7385297f...
VITE_FIREBASE_API_KEY=AIzaSyAbpU...
```

## 📱 Domain Configuration
1. **Backend**: `https://casin-crm-backend.vercel.app`
2. **Frontend**: `https://casin-crm-frontend.vercel.app`

You can add custom domains in Vercel dashboard if needed.

## 🔄 Automatic Deployments
Once connected to GitHub:
- Push to `main` branch → Auto-deploy to production
- Push to other branches → Create preview deployments

## 📊 Database Migration
If switching from local MySQL to cloud:

### Export Current Data
```bash
# Export your local database
mysqldump -u root crud_db > casin_crm_backup.sql
```

### Import to Cloud Database
```bash
# For PlanetScale
pscale shell casin-crm main
source casin_crm_backup.sql

# For Neon (PostgreSQL) - requires conversion
# Use tools like pgloader or manual conversion
```

## 🎯 Production URLs
After deployment:
- **Frontend**: https://your-frontend.vercel.app
- **Backend API**: https://your-backend.vercel.app/api
- **Health Check**: https://your-backend.vercel.app/api/health

## 🛡️ Security Considerations
1. **Environment Variables**: Set in Vercel dashboard, never in code
2. **API Keys**: Use different keys for production
3. **Database**: Use production database with proper security
4. **CORS**: Configure for your frontend domain only

## 🔍 Monitoring & Debugging
- **Vercel Functions**: Monitor in Vercel dashboard
- **Logs**: View real-time logs in Vercel
- **Analytics**: Built-in web analytics
- **Error Tracking**: Consider adding Sentry

## 📞 Support
- Vercel has excellent documentation
- Free tier includes community support
- Pro tier includes email support

## Next Steps
1. Choose your database provider
2. Deploy backend first
3. Update frontend API configuration
4. Deploy frontend
5. Test production deployment
6. Set up custom domains (optional) 