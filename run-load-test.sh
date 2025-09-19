#!/bin/bash

echo "🚀 ActorRating Load Test Runner"
echo "================================"

# Check if app is running
echo "🔍 Checking if app is running on http://localhost:3000..."
if curl -s http://localhost:3000 > /dev/null; then
    echo "✅ App is running"
else
    echo "❌ App is not running on http://localhost:3000"
    echo "   Please start your Next.js app first"
    exit 1
fi

# Check if test endpoint exists
echo ""
echo "🔍 Checking test endpoint..."
if curl -s http://localhost:3000/api/test/ratings > /dev/null; then
    echo "✅ Test endpoint is available"
else
    echo "❌ Test endpoint not found"
    echo "   Make sure you've created /api/test/ratings route"
    exit 1
fi

# Run load test
echo ""
echo "📊 Running Artillery load test..."
npx artillery run load-test-write-heavy.yml

echo ""
echo "✅ Load test completed!"
