FROM node:20-bookworm-slim

# Install PostgreSQL, sudo, and procps (for process management)
RUN apt-get update && apt-get install -y \
    postgresql \
    postgresql-contrib \
    sudo \
    procps \
    && rm -rf /var/lib/apt/lists/*

# Symlink PostgreSQL binaries to make them globally accessible (version agnostic)
RUN for bin in /usr/lib/postgresql/*/bin/*; do ln -sf "$bin" /usr/local/bin/; done

# Create directory for PostgreSQL database storage and set permissions
RUN mkdir -p /data/pgdata && chown -R postgres:postgres /data

# Set working directory
WORKDIR /app

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy the rest of the application files
COPY . .

# Copy and configure startup script
COPY start.sh /usr/local/bin/start.sh
RUN chmod +x /usr/local/bin/start.sh

# Expose the application port
EXPOSE 5000

# Run the startup script
CMD ["/usr/local/bin/start.sh"]
