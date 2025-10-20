FROM node:22-alpine

# Install system dependencies
RUN apk add --no-cache \
    git \
    python3 \
    py3-pip \
    build-base \
    && pip3 install --break-system-packages slither-analyzer solc-select

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY pnpm-lock.yaml* ./

# Install pnpm and dependencies
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build TypeScript
RUN pnpm build

# Create memory directory
RUN mkdir -p /app/memory

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "dist/index.js"]
