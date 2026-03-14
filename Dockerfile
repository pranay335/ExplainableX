# Stage 1: Build Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Final Production Image
FROM node:20-alpine
WORKDIR /app

# Install root dependencies
COPY package*.json ./
RUN npm install --production

# Setup Backend
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm install

# Copy backend source
COPY backend/ ./

# Copy built frontend assets to the backend's public directory
COPY --from=frontend-builder /app/frontend/dist ./public

# Expose the production port
EXPOSE 3000

# Start the application
WORKDIR /app
CMD ["npm", "run", "start:backend"]
