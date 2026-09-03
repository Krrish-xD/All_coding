#!/bin/bash
set -e

echo "🚀 MS Enterprises - Lambda Deployment Script"
echo "=============================================="
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

# Deploy with Terraform
echo "Step 4/4: Deploying with Terraform..."
cd ../infra

echo "Running terraform plan..."
terraform plan -out=tfplan -lock=false

read -p "Apply terraform changes? (yes/no): " CONFIRM
if [ "$CONFIRM" = "yes" ]; then
  terraform apply -auto-approve -lock=false tfplan
  rm tfplan
  echo ""
  echo "✅ Deployment complete!"
  echo ""
  echo "📊 Summary:"
  terraform output
else
  echo "❌ Deployment cancelled"
  rm tfplan
fi