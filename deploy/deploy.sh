#!/bin/bash
set -euo pipefail

# Deploy Spatial Terminal HUD to orangehack.com
# Usage: ./deploy/deploy.sh

REMOTE_DIR="/var/www/quest"

echo "Building client..."
npm run build

echo "Building server..."
cd server && npm run build && cd ..

echo "Deploying to orangehack.com..."
rsync -avz --delete \
  dist/ \
  server/dist/ \
  server/package.json \
  server/package-lock.json \
  deploy/ecosystem.config.cjs \
  orangehack.com:${REMOTE_DIR}/

echo "Installing server dependencies on remote..."
ssh orangehack.com "cd ${REMOTE_DIR}/server && npm ci --production"

echo "Restarting server..."
ssh orangehack.com "cd ${REMOTE_DIR} && pm2 startOrRestart ecosystem.config.cjs"

echo "Done! Visit https://orangehack.com"
