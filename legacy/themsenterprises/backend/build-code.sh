#!/bin/bash
set -e

echo "📝 Building Lambda Code Package..."

# Clean previous build
rm -f code.zip

# Create zip with only application code (no node_modules)
zip -r code.zip \
  app.js \
  lambda.js \
  server.js \
  package.json \
  config/ \
  controllers/ \
  middleware/ \
  models/ \
  routes/ \
  services/ \
  -x "*.log" \
  -x "*.DS_Store" \
  -x "*/.git/*" \
  -x "*/node_modules/*" \
  -x "*.env*" \
  -x "*/tests/*" \
  -x "*.test.js" \
  -x "*/seed/*" \
  -x "seed*.js" \
  -x "*.zip" \
  -x "*/backup/*" \
  -q

CODE_SIZE=$(du -h code.zip | cut -f1)
echo "✅ Code package created: code.zip ($CODE_SIZE)"