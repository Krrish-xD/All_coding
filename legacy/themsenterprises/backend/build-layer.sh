#!/bin/bash
set -e

echo "🔧 Building Lambda Layer..."

# Clean previous builds
rm -rf layer layer.zip

# Create layer structure
mkdir -p layer/nodejs

# Copy package.json
cat > layer/nodejs/package.json << 'EOF'
{
  "name": "ms-enterprises-dependencies",
  "version": "1.0.0",
  "dependencies": {
    "aws-sdk": "^2.1692.0",
    "bcryptjs": "^3.0.2",
    "connect-mongo": "^5.1.0",
    "cors": "^2.8.5",
    "dotenv": "^17.2.2",
    "express": "^5.1.0",
    "express-rate-limit": "^7.4.1",
    "express-session": "^1.18.2",
    "express-validator": "^7.2.1",
    "helmet": "^8.0.0",
    "json2csv": "^6.0.0-alpha.2",
    "jsonwebtoken": "^9.0.2",
    "mongodb": "^6.20.0",
    "mongoose": "^8.18.2",
    "multer": "^2.0.2",
    "nodemailer": "^7.0.6",
    "passport": "^0.7.0",
    "passport-google-oauth20": "^2.0.0",
    "path-to-regexp": "^0.1.7",
    "razorpay": "^2.9.6",
    "serverless-http": "^3.2.0",
    "sharp": "^0.34.4",
    "uuid": "^8.3.2"
  }
}
EOF

echo "📦 Installing dependencies in Docker (Linux x64)..."

docker run --rm \
  --platform linux/amd64 \
  -v "$PWD/layer/nodejs":/var/task \
  -w /var/task \
  --entrypoint "" \
  public.ecr.aws/lambda/nodejs:20 \
  npm install --omit=dev --arch=x64 --platform=linux

echo "🔍 Verifying aws-sdk..."
if [ -d "layer/nodejs/node_modules/aws-sdk" ]; then
  echo "✅ aws-sdk found ($(du -sh layer/nodejs/node_modules/aws-sdk 2>/dev/null | cut -f1 || echo 'size unknown'))"
else
  echo "❌ ERROR: aws-sdk missing!"
  exit 1
fi

echo "📦 Creating layer.zip..."
cd layer
zip -r ../layer.zip . -q
cd ..

LAYER_SIZE=$(ls -lh layer.zip | awk '{print $5}')
echo "✅ Layer created: layer.zip ($LAYER_SIZE)"

