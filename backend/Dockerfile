FROM node:18-alpine

WORKDIR /app

# Copy package files first
COPY package*.json ./

# Install ONLY production dependencies
RUN npm install --only=production

# Copy ONLY the files we need
COPY simple-app.js ./

# Expose port
EXPOSE $PORT

# Start the app with explicit file
CMD ["node", "/app/simple-app.js"] 