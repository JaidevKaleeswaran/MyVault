/**
 * Transaction Schema Reference (JavaScript)
 *
 * This file documents the expected shape of a transaction object in MyVault.
 * Currently transactions live in client-side useReducer state (BudgetContext).
 * When a database is added, this schema should be used as the reference.
 *
 * @typedef {Object} LineItem
 * @property {string}  name     - Item description
 * @property {number}  price    - Unit price
 * @property {number}  quantity - Quantity purchased
 *
 * @typedef {Object} Transaction
 * @property {string}       id                - Unique identifier
 * @property {number}       amount            - Transaction total
 * @property {string}       categoryId        - FK to category
 * @property {string}       description       - User-facing description
 * @property {string}       date              - ISO 8601 date string (YYYY-MM-DD)
 * @property {string|null}  receipt_image_url  - URL to stored receipt image (nullable)
 * @property {LineItem[]|null} line_items      - Parsed line items from receipt (nullable)
 * @property {string}       source            - "manual" (default) | "receipt_scan"
 */

export const TRANSACTION_FIELDS = {
  id:                { type: 'string',  required: true,  default: null },
  amount:            { type: 'number',  required: true,  default: null },
  categoryId:        { type: 'string',  required: true,  default: null },
  description:       { type: 'string',  required: true,  default: '' },
  date:              { type: 'string',  required: true,  default: null },
  receipt_image_url: { type: 'string',  required: false, default: null },
  line_items:        { type: 'json',    required: false, default: null },
  source:            { type: 'string',  required: false, default: 'manual' },
};
