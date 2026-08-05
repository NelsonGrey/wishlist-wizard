// JWT Authentication helpers for the popup

// Check if user is authenticated with background script
async function checkAuthentication() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { action: 'isAuthenticated' },
      (response) => {
        if (response && response.success && response.authenticated) {
          resolve({
            isAuthenticated: true,
            userData: response.userData
          });
        } else {
          resolve({
            isAuthenticated: false
          });
        }
      }
    );
  });
}

// Authenticate with username and password
async function authenticateUser(username, password) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { 
        action: 'authenticate',
        username,
        password
      },
      (response) => {
        if (response && response.success) {
          resolve({
            success: true,
            userData: response.userData || response.user
          });
        } else {
          resolve({
            success: false,
            error: response?.error || 'Authentication failed'
          });
        }
      }
    );
  });
}

// Logout user
async function logoutUser() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { action: 'logout' },
      (response) => {
        resolve({
          success: response?.success || false
        });
      }
    );
  });
}

// Expose functions globally for cross-script access
window.checkAuthentication = checkAuthentication;
window.authenticateUser = authenticateUser;
window.logoutUser = logoutUser;

// Update the popup interface with JWT auth integration
function initAuthPopup() {
  // Find the login form
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      // Get form inputs
      const usernameInput = document.getElementById('username-input');
      const passwordInput = document.getElementById('password-input');
      const loginBtn = document.getElementById('login-button');
      const errorMsg = document.getElementById('login-error');
      
      if (!usernameInput || !passwordInput) {
        console.error('Login form inputs not found');
        return;
      }
      
      // Show loading state
      if (loginBtn) {
        loginBtn.disabled = true;
        loginBtn.textContent = 'Logging in...';
      }
      
      // Clear previous errors
      if (errorMsg) {
        errorMsg.textContent = '';
        errorMsg.classList.add('hidden');
      }
      
      try {
        // Authenticate with the server
        const result = await authenticateUser(
          usernameInput.value, 
          passwordInput.value
        );
        
        if (result.success) {
          // Backward-compatible globals for legacy flows/tests
          window.isLoggedIn = true;
          window.userId = result.userData?.id;
          window.username = result.userData?.username;

          // Authentication successful - update global state in popup.js
          if (typeof window.updateAuthState === 'function') {
            window.updateAuthState({
              isLoggedIn: true,
              userId: result.userData?.id,
              username: result.userData?.username
            });
          }
          
          // Update UI
          const userDisplay = document.getElementById('username');
          if (userDisplay) {
            userDisplay.textContent = result.userData?.username || 'User';
          }
          
          // Show user info
          const userInfo = document.getElementById('user-info');
          if (userInfo) {
            userInfo.classList.remove('hidden');
          }
          
          // Show logout button
          const logoutBtn = document.getElementById('logout-button');
          if (logoutBtn) {
            logoutBtn.classList.remove('hidden');
          }
          
          // Continue to product detection
          if (typeof window.checkProductPage === 'function') {
            await window.checkProductPage();
          }
        } else {
          // Show error
          if (errorMsg) {
            errorMsg.textContent = result.error;
            errorMsg.classList.remove('hidden');
          }
          
          // Reset button
          if (loginBtn) {
            loginBtn.disabled = false;
            loginBtn.textContent = 'Login';
          }
        }
      } catch (error) {
        console.error('Login error:', error);
        
        // Show error message
        if (errorMsg) {
          errorMsg.textContent = error.message || 'An error occurred during login';
          errorMsg.classList.remove('hidden');
        }
        
        // Reset button
        if (loginBtn) {
          loginBtn.disabled = false;
          loginBtn.textContent = 'Login';
        }
      }
    });
  }
  
  // Setup logout button
  const logoutBtn = document.getElementById('logout-button');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async function() {
      await logoutUser();
      location.reload(); // Refresh popup
    });
  }
  
  // Setup web login button
  const webLoginBtn = document.getElementById('web-login-button');
  if (webLoginBtn) {
    webLoginBtn.addEventListener('click', function() {
      chrome.runtime.sendMessage({ action: 'login' });
      window.close(); // Close popup
    });
  }
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', initAuthPopup);
} else {
  initAuthPopup();
}