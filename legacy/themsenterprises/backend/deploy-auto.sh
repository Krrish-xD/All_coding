#!/bin/bash
set -e

echo "🚀 MS Enterprises - Automated Lambda Deployment"
echo "================================================"
echo ""

# Build layer
echo "Step 1/4: Building Lambda Layer..."
./build-layer.sh
echo ""

# Build code
echo "Step 2/4: Building Code Package..."
./build-code.sh
echo ""

# Move to infra directory
echo "Step 3/4: Moving packages to infra directory..."
mv layer.zip ../infra/
mv code.zip ../infra/
echo "✅ Packages moved to infra/"
echo ""

# Deploy with Terraform (auto-approve)
echo "Step 4/4: Deploying with Terraform..."
cd ../infra

terraform apply -auto-approve -lock=false

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📊 Summary:"
terraform output