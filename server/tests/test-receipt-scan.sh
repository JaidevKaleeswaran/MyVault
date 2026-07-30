#!/bin/bash
# =============================================================================
# test-receipt-scan.sh — Manual curl tests for POST /api/receipts/scan
#
# Prerequisites:
#   1. Set GEMINI_API_KEY in your .env file
#   2. Start the server: npm run server
#   3. Have a sample receipt image (e.g. test-receipt.jpg)
#
# Usage:
#   bash server/tests/test-receipt-scan.sh [path-to-receipt-image]
# =============================================================================

BASE_URL="${BASE_URL:-http://localhost:5000}"
RECEIPT_IMAGE="${1:-server/tests/test-receipt.jpg}"

echo "============================================="
echo " MyVault Receipt Scan — API Tests"
echo " Server: $BASE_URL"
echo "============================================="
echo ""

# ── Test 1: Health check ────────────────────────────────────────────────────
echo "--- Test 1: Health Check ---"
curl -s "$BASE_URL/api/health" | python -m json.tool 2>/dev/null || curl -s "$BASE_URL/api/health"
echo ""
echo ""

# ── Test 2: No file uploaded ────────────────────────────────────────────────
echo "--- Test 2: No file uploaded (expect 400) ---"
curl -s -w "\nHTTP Status: %{http_code}\n" \
  -X POST "$BASE_URL/api/receipts/scan"
echo ""

# ── Test 3: Wrong file type ─────────────────────────────────────────────────
echo "--- Test 3: Wrong file type (expect 415) ---"
echo "not an image" > /tmp/test-receipt.txt
curl -s -w "\nHTTP Status: %{http_code}\n" \
  -X POST "$BASE_URL/api/receipts/scan" \
  -F "receipt=@/tmp/test-receipt.txt;type=text/plain"
rm -f /tmp/test-receipt.txt
echo ""

# ── Test 4: Valid receipt image ─────────────────────────────────────────────
if [ -f "$RECEIPT_IMAGE" ]; then
  echo "--- Test 4: Valid receipt image ---"
  curl -s -w "\nHTTP Status: %{http_code}\n" \
    -X POST "$BASE_URL/api/receipts/scan" \
    -F "receipt=@$RECEIPT_IMAGE" | python -m json.tool 2>/dev/null || \
  curl -s -w "\nHTTP Status: %{http_code}\n" \
    -X POST "$BASE_URL/api/receipts/scan" \
    -F "receipt=@$RECEIPT_IMAGE"
else
  echo "--- Test 4: SKIPPED (no receipt image found at $RECEIPT_IMAGE) ---"
  echo "  Pass a receipt image path as the first argument:"
  echo "  bash server/tests/test-receipt-scan.sh path/to/receipt.jpg"
fi
echo ""
echo "============================================="
echo " Tests complete"
echo "============================================="
