# Use Node.js LTS version as the base image
FROM node:20-slim

# Install pnpm globally
RUN npm install -g pnpm@9.2.0

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy the rest of the application
COPY . .

# Build TypeScript
RUN pnpm build

# Expose any necessary ports (if needed)
# EXPOSE 8080

# Start the application
CMD ["node", "dist/agent.js"] 