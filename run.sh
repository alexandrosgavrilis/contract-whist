#!/usr/bin/env bash
# Start Contract Whist and open it in the browser.
set -euo pipefail
cd "$(dirname "$(readlink -f "$0")")"

PORT=8088
URL="http://localhost:${PORT}/"

if docker compose version >/dev/null 2>&1; then
  DC="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  DC="docker-compose"
else
  echo "Docker Compose not found." >&2
  echo "No Docker? You can also just open site/index.html in a browser." >&2
  exit 1
fi

$DC up -d

# wait for nginx to answer before opening the tab
for _ in $(seq 1 40); do
  if curl -sf -o /dev/null "$URL"; then break; fi
  sleep .25
done

xdg-open "$URL" >/dev/null 2>&1 || echo "Open $URL"
