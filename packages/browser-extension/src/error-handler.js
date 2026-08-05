/**
 * Wishlist Wizard Extension Error Handler
 * 
 * This module provides centralized error handling for the extension,
 * including logging, user-friendly messages, and error reporting.
 */

// Error types
const ErrorType = {
  NETWORK: 'network',
  AUTH: 'authentication',
  PERMISSION: 'permission',
  PARSING: 'parsing',
  DETECTION: 'detection',
  UNKNOWN: 'unknown'
};

// User-friendly error messages
const ErrorMessages = {
  [ErrorType.NETWORK]: {
    title: 'Connection Problem',
    message: 'Unable to connect to Wishlist Wizard servers. Please check your internet connection and try again.',
    action: 'Retry'
  },
  [ErrorType.AUTH]: {
    title: 'Authentication Required',
    message: 'Please sign in to your Wishlist Wizard account to continue.',
    action: 'Sign In'
  },
  [ErrorType.PERMISSION]: {
    title: 'Permission Required',
    message: 'Wishlist Wizard needs permission to access this page. Please update your extension settings.',
    action: 'Update Settings'
  },
  [ErrorType.PARSING]: {
    title: 'Information Extraction Failed',
    message: 'We couldn\'t extract the product information from this page. You can try manual extraction.',
    action: 'Try Manual'
  },
  [ErrorType.DETECTION]: {
    title: 'Not a Product Page',
    message: 'This doesn\'t appear to be a product page. Navigate to a product page and try again.',
    action: 'Force Detection'
  },
  [ErrorType.UNKNOWN]: {
    title: 'Something Went Wrong',
    message: 'An unexpected error occurred. Please try again or contact support if the issue persists.',
    action: 'Try Again'
  }
};

/**
 * Handles errors throughout the extension
 * 
 * @param {Error|string} error - The error object or message
 * @param {string} context - Where the error occurred (e.g., 'popup', 'content', 'background')
 * @param {string} type - Type of error from ErrorType enum
 * @param {Object} details - Additional error details
 * @returns {Object} Error info with user-friendly message
 */
function handleError(error, context = 'general', type = ErrorType.UNKNOWN, details = {}) {
  // Get the error message
  const errorMessage = error instanceof Error ? error.message : error;
  
  // Get the error stack if available
  const errorStack = error instanceof Error ? error.stack : new Error().stack;
  
  // Log the error for debugging
  console.error(`Wishlist Wizard Error (${context}):`, errorMessage);
  console.debug('Error details:', { type, details, stack: errorStack });
  
  // Prepare user-friendly error info
  const errorInfo = {
    type,
    context,
    message: errorMessage,
    details,
    userMessage: ErrorMessages[type].title,
    userDescription: ErrorMessages[type].message,
    actionText: ErrorMessages[type].action,
    timestamp: new Date().toISOString()
  };
  
  // Report the error (in production, this would send to a server)
  if (process.env.NODE_ENV === 'production') {
    reportError(errorInfo);
  }
  
  return errorInfo;
}

/**
 * Reports errors to the server for monitoring
 * (This would be implemented in production)
 */
function reportError(errorInfo) {
  // In a production environment, this would send the error to a server
  // for monitoring and analysis
  try {
    // Simulated server reporting
    console.debug('Reporting error to server:', errorInfo);
    
    // This would be an actual API call in production
    // fetch('https://wishlist-wizard.web.app/api/extension/errors', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(errorInfo)
    // });
  } catch (e) {
    // Don't let error reporting cause more errors
    console.error('Error reporting failed:', e);
  }
}

/**
 * Creates an action handler for error recovery
 * 
 * @param {string} type - Error type from ErrorType enum
 * @param {Function} handler - Function to handle the recovery action
 * @returns {Function} Action handler
 */
function createErrorAction(type, handler) {
  return function() {
    console.log(`Executing error recovery for ${type}`);
    return handler();
  };
}

// Export the error handler for use throughout the extension
export {
  handleError,
  ErrorType,
  ErrorMessages,
  createErrorAction
};