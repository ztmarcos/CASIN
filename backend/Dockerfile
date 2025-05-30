FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy backend source code
COPY . .

# Expose port
EXPOSE $PORT

# Start the backend
CMD ["node", "simple-app.js"] 