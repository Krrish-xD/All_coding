#!/bin/bash

# Production API Testing Script for MS Enterprises E-commerce
# Replace 'https://your-production-api-url' with your actual production API URL

API_URL="https://api.themsenterprises.com"
echo "Testing API at: $API_URL"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to make curl request and check response
test_endpoint() {
    local method=$1
    local url=$2
    local data=$3
    local headers=$4
    local description=$5

    echo -e "\n${YELLOW}Testing: $description${NC}"
    echo "URL: $url"
    echo "Method: $method"

    local cmd="curl -s -X $method '$url'"
    if [ -n "$headers" ]; then
        cmd="$cmd $headers"
    fi
    if [ -n "$data" ]; then
        cmd="$cmd -H 'Content-Type: application/json' -d '$data'"
    fi

    echo "Command: $cmd"
    response=$(eval $cmd)
    echo "Response: $response"

    # Check if response contains success indicators
    if echo "$response" | grep -q '"success":true\|"status":"OK"\|"message"'; then
        echo -e "${GREEN}✓ PASS${NC}"
    else
        echo -e "${RED}✗ FAIL${NC}"
    fi
}

echo "Starting API Tests..."
echo "=========================================="

# 1. Health Check
test_endpoint "GET" "$API_URL/health" "" "" "Health Check Endpoint"

# 2. Get Products (should return 81 products)
test_endpoint "GET" "$API_URL/api/products" "" "" "Get Products (should return 81 seeded products)"

# 3. User Registration
test_endpoint "POST" "$API_URL/api/auth/register" '{
  "username": "testuser_prod",
  "email": "test_prod@example.com",
  "password": "testpass123"
}' "" "User Registration"

# 4. User Login
echo -e "\n${YELLOW}Testing: User Login${NC}"
login_response=$(curl -s -X POST "$API_URL/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "test_prod@example.com",
    "password": "testpass123"
  }')
echo "Login Response: $login_response"

# Extract token from login response
token=$(echo $login_response | grep -o '"token":"[^"]*' | cut -d'"' -f4)
if [ -n "$token" ]; then
    echo -e "${GREEN}✓ Login successful, token extracted${NC}"
    auth_header="-H 'Authorization: Bearer $token'"
else
    echo -e "${RED}✗ Login failed, cannot proceed with authenticated tests${NC}"
    exit 1
fi

# 5. Get User Profile
test_endpoint "GET" "$API_URL/api/auth/profile" "" "$auth_header" "Get User Profile"

# 6. Get a product ID for cart testing
echo -e "\n${YELLOW}Getting a product ID for cart testing...${NC}"
products_response=$(curl -s -X GET "$API_URL/api/products?limit=1")
product_id=$(echo $products_response | grep -o '"_id":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -n "$product_id" ]; then
    echo "Using product ID: $product_id"

    # 7. Add to Cart
    test_endpoint "POST" "$API_URL/api/cart" "{
      \"productId\": \"$product_id\",
      \"quantity\": 1
    }" "$auth_header" "Add to Cart"

    # 8. Get Cart
    test_endpoint "GET" "$API_URL/api/cart" "" "$auth_header" "Get Cart"
else
    echo -e "${RED}✗ Could not get product ID for cart testing${NC}"
fi

# 9. Admin Login
echo -e "\n${YELLOW}Testing: Admin Login${NC}"
admin_response=$(curl -s -X POST "$API_URL/api/admin2009/login" \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "admin@msenterprises.com",
    "password": "admin123"
  }')
echo "Admin Login Response: $admin_response"

# Extract admin token
admin_token=$(echo $admin_response | grep -o '"token":"[^"]*' | cut -d'"' -f4)
if [ -n "$admin_token" ]; then
    echo -e "${GREEN}✓ Admin login successful${NC}"
    admin_auth_header="-H 'Authorization: Bearer $admin_token'"

    # 10. Admin Dashboard
    test_endpoint "GET" "$API_URL/api/admin2009/dashboard" "" "$admin_auth_header" "Admin Dashboard"
else
    echo -e "${RED}✗ Admin login failed${NC}"
fi

# 11. Create Order (if we have product_id)
if [ -n "$product_id" ]; then
    test_endpoint "POST" "$API_URL/api/orders" "{
      \"products\": [{\"product\": \"$product_id\", \"quantity\": 1}],
      \"shippingAddress\": {
        \"name\": \"Test User\",
        \"street\": \"123 Test St\",
        \"city\": \"Test City\",
        \"state\": \"Test State\",
        \"zip\": \"12345\",
        \"phone\": \"1234567890\"
      },
      \"totalAmount\": 25.00
    }" "$auth_header" "Create Order"
fi

# 12. Get Orders
test_endpoint "GET" "$API_URL/api/orders" "" "$auth_header" "Get Orders"

# 13. Test CORS
echo -e "\n${YELLOW}Testing: CORS Headers${NC}"
cors_response=$(curl -s -I -X OPTIONS "$API_URL/api/products" \
  -H 'Origin: https://app.themsenterprises.com' \
  -H 'Access-Control-Request-Method: GET')
echo "CORS Response Headers:"
echo "$cors_response"

if echo "$cors_response" | grep -q "access-control-allow-origin"; then
    echo -e "${GREEN}✓ CORS headers present${NC}"
else
    echo -e "${RED}✗ CORS headers missing${NC}"
fi

echo ""
echo "=========================================="
echo "API Testing Complete!"
echo "=========================================="
echo ""
echo "Summary of Tests:"
echo "- Health check"
echo "- Product listing (81 seeded products)"
echo "- User registration/login"
echo "- Cart operations"
echo "- Admin authentication"
echo "- Order creation"
echo "- CORS configuration"
echo ""
echo "Replace 'https://your-production-api-url' with your actual production URL"
echo "Run this script: chmod +x production-api-tests.sh && ./production-api-tests.sh"
