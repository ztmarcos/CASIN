# Notion Integration Setup

This document explains how to set up the Notion integration for the application.

## CORS Issue and Solution

The Notion API does not allow direct browser-to-API communication due to CORS restrictions. You'll see this error if you try to access it directly from the frontend:

```
Access to fetch at 'https://api.notion.com/v1/databases/...' from origin 'http://...' has been blocked by CORS policy
```

This is why we've implemented a backend proxy server to handle communication with the Notion API.

## Setup Instructions

1. **Environment Variables**

   Create or update your `.env` file with the following variables:

   ```
   NOTION_SECRET_KEY=your_notion_integration_secret_key
   NOTION_DATABASE_ID=your_notion_database_id
   ```

   You can find these values in your Notion integration settings.

2. **Validate Your Setup**

   Run the validation script to ensure everything is configured correctly:

   ```
   node check-notion-setup.js
   ```

   This script will verify your environment variables and test the connection to Notion.

3. **Start the Backend Server**

   Once validation passes, run the backend server that will act as a proxy for Notion API calls:

   ```
   node start-server.js
   ```

   This will start the server on port 3001 (or the port specified in your .env file).

4. **Backend URL Configuration**

   The frontend is configured to connect to the backend at `http://localhost:3001`. If your backend is running on a different host or port, you'll need to update the `API_URL` constant in `src/components/Notion/NotionComponent.jsx`.

## Common Issues

### 404 Not Found Error

If you see a 404 error when trying to fetch tasks:

```
GET http://your-frontend-url/api/notion/tasks 404 (Not Found)
```

This usually means one of these issues:

1. The backend server is not running (solution: run `node start-server.js`)
2. The frontend is trying to access the API at the wrong URL (check `API_URL` in NotionComponent.jsx)
3. CORS is not correctly configured (the backend notionRoutes.js has CORS headers configured)

### Authorization Error

If you see authorization errors from Notion:

```
Error: Failed to fetch tasks from Notion
```

Verify that:
1. Your `NOTION_SECRET_KEY` is correct in the .env file
2. Your integration has been properly set up in Notion
3. Your integration has been granted access to the database you're trying to query

## How It Works

1. The React frontend makes requests to the backend server at `http://localhost:3001/api/notion/tasks`
2. The backend server receives these requests and forwards them to the Notion API with the proper authentication
3. The backend server receives the response from Notion and forwards it back to the frontend

This proxy approach solves the CORS issue and also keeps your Notion secret key secure by not exposing it to the client.

## Card View UI

The UI has been simplified to show large card icons for tasks that link directly to the Notion tasks. This provides a clean, simple interface while maintaining the connection to your Notion workspace. 