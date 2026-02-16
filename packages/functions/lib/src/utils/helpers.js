"use strict";
// Utility functions for Firebase Functions
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateId = generateId;
exports.isValidEmail = isValidEmail;
exports.sanitizeHtml = sanitizeHtml;
exports.generateSafeFilename = generateSafeFilename;
exports.parsePrice = parsePrice;
exports.formatPrice = formatPrice;
exports.debounce = debounce;
exports.chunkArray = chunkArray;
exports.sleep = sleep;
exports.retryWithBackoff = retryWithBackoff;
/**
 * Generate a random ID for share links and other purposes
 */
function generateId() {
    return Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);
}
/**
 * Validate email format
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}
/**
 * Sanitize HTML content to prevent XSS
 */
function sanitizeHtml(html) {
    return html
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
}
/**
 * Generate a safe filename from a string
 */
function generateSafeFilename(input) {
    return input
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}
/**
 * Parse price string to numeric value
 */
function parsePrice(priceString) {
    if (!priceString)
        return 0;
    // Remove currency symbols and extract numeric value
    const cleaned = priceString.replace(/[^0-9.,]/g, '');
    const normalized = cleaned.replace(/,/g, '.');
    return parseFloat(normalized) || 0;
}
/**
 * Format price for display
 */
function formatPrice(price, currency = 'USD') {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
    }).format(price);
}
/**
 * Debounce function for rate limiting
 */
function debounce(func, wait) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}
/**
 * Chunk array into smaller arrays
 */
function chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
}
/**
 * Sleep for specified milliseconds
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
/**
 * Retry async operation with exponential backoff
 */
async function retryWithBackoff(operation, maxRetries = 3, baseDelay = 1000) {
    let lastError;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        }
        catch (error) {
            lastError = error;
            if (attempt === maxRetries) {
                throw lastError;
            }
            const delay = baseDelay * Math.pow(2, attempt);
            await sleep(delay);
        }
    }
    throw lastError;
}
//# sourceMappingURL=helpers.js.map