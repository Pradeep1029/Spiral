# Use lightweight Node.js image
FROM node:20-alpine

# Create app directory
WORKDIR /app

# Install dependencies first (leveraging Docker layer cache)
COPY package*.json ./
RUN npm ci --omit=dev

# Copy the rest of the application code
COPY . .

# Set environment variables
ENV NODE_ENV=production \
    PORT=3000

# Expose the app port
EXPOSE 3000

# Optional healthcheck (adjust URL if needed)
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

# Start the server
CMD ["node", "src/server.js"]
