# Dockerfile for jsii multi-language package generation
# Provides Python, Java, Go, and .NET compilers for complete jsii-pacmak builds

FROM node:lts-bookworm

# Install Python 3 with pip
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    && rm -rf /var/lib/apt/lists/*

# Install Java JDK 17 and Maven
RUN apt-get update && apt-get install -y \
    openjdk-17-jdk \
    maven \
    && rm -rf /var/lib/apt/lists/*

# Install Go 1.24 (Debian has older version that doesn't support go 1.25 modules)
RUN apt-get update && apt-get install -y wget && rm -rf /var/lib/apt/lists/* \
    && wget https://go.dev/dl/go1.24.4.linux-amd64.tar.gz -O go.tar.gz \
    && tar -C /usr/local -xzf go.tar.gz \
    && rm go.tar.gz \
    && ln -s /usr/local/go/bin/go /usr/bin/go

# Install .NET SDK 8.0 using Microsoft's install script
RUN wget https://dot.net/v1/dotnet-install.sh -O dotnet-install.sh \
    && chmod +x dotnet-install.sh \
    && ./dotnet-install.sh --channel 8.0 --install-dir /usr/share/dotnet \
    && rm dotnet-install.sh \
    && ln -s /usr/share/dotnet/dotnet /usr/bin/dotnet

# Set working directory
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install npm dependencies
RUN npm ci

# Copy the rest of the source
COPY . .

# Default command: enable all targets, then build and package
CMD ["sh", "-c", "node scripts/enable-all-targets.js && npm run build && npm run package"]
