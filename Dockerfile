# Use official Node.js image as the base image
FROM --platform=linux/amd64 node:18-alpine as builder

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Use lightweight image for runtime
FROM --platform=linux/amd64 node:18-alpine

# Set working directory
WORKDIR /app

# Copy build results and dependencies from builder stage
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/server.js ./
COPY --from=builder /app/src ./src
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
ENV AGENT_CARD=default

# Expose port
EXPOSE 3000

# Start command
CMD ["node", "server.js"] 