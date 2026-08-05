/**
 * Receipt Scanner Agent — Wraps the server-side Gemini Vision receipt scanning
 * 
 * Takes a photo/image file, sends it to the existing /api/receipts/scan endpoint,
 * parses the response, and passes structured data to the Manager Agent for
 * categorization and dashboard insertion.
 */

const API_BASE = 'http://localhost:5000';

/**
 * Scan a receipt image by sending it to the backend Gemini Vision endpoint
 * @param {File} imageFile - The receipt image file
 * @returns {Object} Structured receipt data
 */
export async function scanReceipt(imageFile) {
  if (!imageFile) {
    throw new Error('No image file provided');
  }

  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(imageFile.type)) {
    throw new Error('Unsupported image type. Please use JPEG, PNG, or WebP.');
  }

  // Validate file size (10MB max)
  if (imageFile.size > 10 * 1024 * 1024) {
    throw new Error('Image file is too large. Maximum size is 10MB.');
  }

  const formData = new FormData();
  formData.append('receipt', imageFile);

  const response = await fetch(`${API_BASE}/api/receipts/scan`, {
    method: 'POST',
    body: formData,
  });

  const json = await response.json();

  if (!response.ok) {
    throw new Error(json.message || json.error || 'Failed to scan receipt');
  }

  // Return structured data for the Manager Agent
  return {
    merchant: json.data?.merchant || 'Unknown Store',
    date: json.data?.date || new Date().toISOString().split('T')[0],
    amount: json.data?.total || 0,
    subtotal: json.data?.subtotal || null,
    tax: json.data?.tax || null,
    tip: json.data?.tip || null,
    paymentMethod: json.data?.payment_method || null,
    lineItems: json.data?.line_items || [],
    suggestedCategory: json.data?.suggested_category || 'Other',
    receiptImageUrl: json.receipt_image_url || null,
    validation: json.validation || 'Pydantic Enforced',
    engine: json.engine || 'pydantic_python',
    raw: json,
  };
}

/**
 * Process a scanned receipt through the Manager Agent pipeline
 * This is the high-level function that components should call
 */
export async function processScannedReceipt(imageFile, managerProcessFn, budgetState, dispatch) {
  // Step 1: Scan the receipt
  const scanResult = await scanReceipt(imageFile);

  // Step 2: Pass to Manager Agent for categorization and dispatch
  const managerResult = await managerProcessFn(
    {
      description: scanResult.merchant ? `Receipt: ${scanResult.merchant}` : 'Scanned Receipt',
      amount: scanResult.amount,
      date: scanResult.date,
      merchant: scanResult.merchant,
      lineItems: scanResult.lineItems,
    },
    budgetState,
    dispatch
  );

  return {
    ...managerResult,
    scanData: scanResult,
  };
}
