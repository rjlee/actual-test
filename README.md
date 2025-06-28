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

## Troubleshooting connectivity

Before running the snippet below, load your `.env` into the current shell so the variables expand. For example:

```bash
set -a && . ./.env && set +a
```

If you encounter `PostError: network-failure` when downloading your budget, verify the download endpoint is reachable:

```bash
# 1️⃣ Health endpoint (must return 200 OK)
curl -k -i -u ":${ACTUAL_PASSWORD}" "${ACTUAL_SERVER_URL}/health"

# 2️⃣ Budget download endpoint (must return 200 OK)
curl -k -i -u ":${ACTUAL_PASSWORD}" "${ACTUAL_SERVER_URL}/api/budgets/${ACTUAL_SYNC_ID}/download"

# 3️⃣ Login endpoint (must return JSON with data.token)
curl -k -i -X POST -H "Content-Type: application/json" \
  -d '{"password":"'"${ACTUAL_PASSWORD}"'"}' \
  "${ACTUAL_SERVER_URL}/account/login"

# Extract the returned token
TOKEN=$(curl -k -s -X POST -H "Content-Type: application/json" \
  -d '{"password":"'"${ACTUAL_PASSWORD}"'"}' \
  "${ACTUAL_SERVER_URL}/account/login" \
  | grep -oP '"token":\s*"\K[^"]+')
echo "Token: $TOKEN"

# 4️⃣ Sync endpoint (must return 200 OK or 422 Unprocessable Entity)
curl -k -i -X POST --data-binary '' \
  -H "Content-Type: application/actual-sync" \
  -H "X-ACTUAL-TOKEN: $TOKEN" \
  "${ACTUAL_SERVER_URL}/sync/sync"
```

#

Note: if the `/sync` test fails or you still see `network-failure` in the daemon logs,
Your reverse-proxy or web server may be intercepting POST `/sync` (returning 404/422 or serving your front-end) instead of forwarding it to the sync-server. Ensure you have a proxy rule for POST `/sync` (and other binary‑sync endpoints such as `/download-user-file`, `/get-user-file-info`, `/upload-user-file`, etc.) that routes to the sync-server before any static or front‑end fallback.

## (Optional) Local hostname mapping for Docker

If you’re running the daemon on the same host as the sync-server and need to map
the server hostname to localhost so Docker’s bridge can reach it:

In your `.env` (uncomment to enable):

```ini
OPTIONAL_EXTRA_HOST=your.actual-budget-server:127.0.0.1
```

In `docker-compose.yml` under `budget-daemon`:

```yaml
network_mode: host
extra_hosts:
  - '${OPTIONAL_EXTRA_HOST}'
```
