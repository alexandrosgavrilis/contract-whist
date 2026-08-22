#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$(readlink -f "$0")")"
if docker compose version >/dev/null 2>&1; then docker compose down; else docker-compose down; fi
