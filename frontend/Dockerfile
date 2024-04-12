# Ubuntu image
FROM ubuntu:22.04

# Workird path
WORKDIR /app

# Copy local files in the path
COPY . /app/.

# Install necessary dependencies
RUN apt-get update && \
    apt-get install -y curl

# Curl node and install
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs

# Go to path and install node dependencies
RUN cd /app && npm install

# Build frontend
RUN npm run build

# Host
ENV HOST=0.0.0.0

# Port
ENV PORT=4321
EXPOSE 4321

# Run project
CMD ["npm","run","dev","--","--host"]