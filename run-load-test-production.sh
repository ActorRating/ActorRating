#!/bin/bash

# Load test script for ActorRating.com production readiness
# Usage: ./run-load-test-production.sh [BASE_URL]

set -e

BASE_URL=${1:-"http://localhost:3000"}

echo "🚀 Starting ActorRating.com Load Test"
echo "📍 Target URL: $BASE_URL"
echo "👥 50 virtual users for 1 minute"
echo "=================================="

# Check if k6 is installed
if ! command -v k6 &> /dev/null; then
    echo "❌ k6 is not installed. Please install it first:"
    echo "   macOS: brew install k6"
    echo "   Linux: sudo apt update && sudo apt install k6"
    echo "   Windows: choco install k6"
    exit 1
fi

# Run the load test
echo "🔥 Running load test..."
BASE_URL="$BASE_URL" k6 run load-test.js

echo ""
echo "✅ Load test completed!"
echo "📊 Check load-test-summary.json for detailed results"
echo "📈 Key metrics to monitor:"
echo "   - HTTP request duration p(95) should be < 1000ms"
echo "   - HTTP request failure rate should be < 10%"
echo "   - All endpoints should handle the load gracefully"
echo "   - Rate limiting should kick in properly"
