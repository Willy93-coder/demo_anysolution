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

# Port
EXPOSE 3005

CMD node server.js && tail -f /dev/null