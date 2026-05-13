#!/usr/bin/env bash
set -euo pipefail

DIR="$(cd "$(dirname "$0")/../nginx/certs" && pwd)"
mkdir -p "$DIR"

openssl req -x509 -nodes -newkey rsa:2048 \
  -keyout "$DIR/clipsphere.local.key" \
  -out    "$DIR/clipsphere.local.crt" \
  -days 825 \
  -subj "/C=EG/ST=Cairo/L=Cairo/O=ClipSphere/OU=Dev/CN=clipsphere.local" \
  -addext "subjectAltName=DNS:clipsphere.local,DNS:localhost,IP:127.0.0.1"

echo "Cert + key written to $DIR"
ls -l "$DIR"/clipsphere.local.{crt,key}
