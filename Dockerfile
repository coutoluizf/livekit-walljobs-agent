# -----------------------------
# Stage 1: Build
# -----------------------------
    FROM node:20-slim AS builder

    # Install pnpm at the specified version
    RUN npm install -g pnpm@9.2.0
    
    WORKDIR /build
    
    # Copy package files
    COPY package.json pnpm-lock.yaml ./
    
    # Install all dependencies (including dev deps)
    RUN pnpm install --frozen-lockfile
    
    # Copy the rest of the source files (tsconfig, src, etc.)
    COPY . .
    
    # Build the TypeScript source
    RUN pnpm build
    
    
    # -----------------------------
    # Stage 2: Production
    # -----------------------------
    FROM node:20-slim

    # (1) Install CA certificates so Node can trust SSL
    RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*
    
    WORKDIR /app
    
    # Install pnpm at the same version
    RUN npm install -g pnpm@9.2.0
    
    # Copy only the package files needed to install production dependencies
    COPY package.json pnpm-lock.yaml ./
    
    # Install only production dependencies
    RUN pnpm install --frozen-lockfile --prod
    
    # Copy the compiled artifacts from builder
    COPY --from=builder /build/dist ./dist
    
    # Optionally copy your .env.local for runtime config
    # Copy and fix permissions in one step
    COPY --from=builder /build/.env.local .env.local
    RUN chown node:node .env.local && chmod 600 .env.local
    
    # Set the environment to production
    ENV NODE_ENV=production
    
    # Use a non-root user for security
    USER node
    
    # ENTRYPOINT ensures the Node process and extra flags always run
    ENTRYPOINT ["node", "--experimental-specifier-resolution=node", "--enable-source-maps", "dist/agent.js"]
    
    # CMD is the default argument to the entrypoint (here it's "dev")
    CMD ["dev"]