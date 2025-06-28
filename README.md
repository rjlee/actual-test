# Actual Budget Daemon

This script periodically syncs your Actual budget and prints account balances.

## Setup

Create a `.env` file in this directory based on `.env.example` and fill in the required values:

```ini
# Relative or absolute path to cache budget data (directory will be created if missing)
BUDGET_CACHE_DIR=/path/to/your/Actual/data

# URL of your running Actual sync server
ACTUAL_SERVER_URL=http://localhost:5006

# Password for server authentication
ACTUAL_PASSWORD=yourpassword

# The Sync ID (groupId) from Settings → Show advanced settings → Sync ID
ACTUAL_SYNC_ID=your-sync-id

# (Optional) for self-signed certificates
# NODE_TLS_REJECT_UNAUTHORIZED=0
```

If your budget directory isn't present locally, the daemon will auto-download it on first run using your server URL and password.

## Installation

Install dependencies (and ensure you're running Node.js v20 or newer):

```bash
npm install
```

## Usage

Start the daemon (Node.js v20+ required):

```bash
npm start
```

Or run directly:

```bash
node index.js
```

## Docker Compose

If you have Docker and Docker Compose installed, you can run the daemon in a container:

```bash
# Copy the example .env and edit it as needed (ensure BUDGET_CACHE_DIR is an absolute host path)
cp .env.example .env
# Pull the pre-built image and run
docker-compose pull
docker-compose up
# To run in the background:
docker-compose up -d
```

This pulls the pre-built image from GHCR (as specified in the compose file), bind‑mounts the host path defined in `BUDGET_CACHE_DIR` into `/app/data` inside the container, and streams balance updates in the logs.

Alternatively, you can build and run the Docker image manually:

```bash
# Pull the latest image instead of building
docker pull ghcr.io/rjlee/actual-test:latest
docker run --rm -it \
  --env-file .env \
  --env BUDGET_CACHE_DIR=/app/data \
  -v ${BUDGET_CACHE_DIR}:/app/data \
  ghcr.io/rjlee/actual-test:latest
```
