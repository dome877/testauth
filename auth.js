// Production auth.js for GitHub Pages with AWS Lambda token exchange

// Configuration
const CONFIG = {
  cognitoUrl: 'https://eu-north-1bad4kil2h.auth.eu-north-1.amazoncognito.com',
  clientId: 'sufnmmml754ju6m6en2cerr4t',
  redirectUri: window.location.origin + window.location.pathname,
  tokenExchangeUrl: 'https://0izwpxiog3.execute-api.eu-north-1.amazonaws.com/prod/token-exchange',
  scope: 'email openid phone'
};

// Track if we've already processed the code
let authCodeProcessed = false;

// Check if user is authenticated
function isAuthenticated() {
  const hasToken = !!getIdToken();
  const notExpired = !isTokenExpired();
  console.log('Auth check - Has token:', hasToken, 'Not expired:', notExpired);
  return hasToken && notExpired;
}

// Check if token is expired
function isTokenExpired() {
  const expiration = localStorage.getItem('tokenExpiration');
  if (!expiration) return true;
  return new Date().getTime() > parseInt(expiration);
}

// Securely get ID token
function getIdToken() {
  return localStorage.getItem('idToken');
}

// Securely get access token
function getAccessToken() {
  return localStorage.getItem('accessToken');
}

// Get refresh token
function getRefreshToken() {
  return localStorage.getItem('refreshToken');
}

// Store tokens securely
function storeTokens(idToken, accessToken, refreshToken, expiresIn = 3600) {
  console.log('Storing tokens with expiry:', expiresIn);
  localStorage.setItem('idToken', idToken);
  localStorage.setItem('accessToken', accessToken);
  if (refreshToken) {
    localStorage.setItem('refreshToken', refreshToken);
  }
  const expirationTime = new Date().getTime() + (expiresIn * 1000);
  localStorage.setItem('tokenExpiration', expirationTime.toString());
}

// Clear tokens
function clearTokens() {
  localStorage.removeItem('idToken');
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('tokenExpiration');
}

// Redirect to Cognito login - with full logout first
function redirectToLogin() {
  // First, log out from Cognito to clear any existing sessions
  const logoutUrl = `${CONFIG.cognitoUrl}/logout?client_id=${CONFIG.clientId}&logout_uri=${encodeURIComponent(CONFIG.redirectUri)}`;
  console.log('Redirecting to complete logout first, then will redirect to login');
  window.location.href = logoutUrl;
}

// Logout user
function logout() {
  clearTokens();
  const logoutUrl = `${CONFIG.cognitoUrl}/logout?client_id=${CONFIG.clientId}&logout_uri=${encodeURIComponent(CONFIG.redirectUri)}`;
  window.location.href = logoutUrl;
}

// Handle authentication redirect
async function handleAuthenticationRedirect() {
  if (authCodeProcessed) {
    console.log('Auth code already processed, skipping duplicate handling');
    return;
  }
  
  const urlParams = new URLSearchParams(window.location.search);
  const authorizationCode = urlParams.get('code');

  console.log('AUTH.JS: URL parameters check running');
  console.log('Authorization code present in URL:', authorizationCode ? 'Yes (first 10 chars: ' + authorizationCode.substring(0, 10) + '...)' : 'No');

  if (authorizationCode) {
    // Mark as processed immediately to prevent duplicate calls
    authCodeProcessed = true;
    
    console.log('Found authorization code - calling exchangeCodeForTokens');
    
    // First remove the code from URL for security
    window.history.replaceState({}, document.title, window.location.pathname);
    
    // Then exchange the code
    const success = await exchangeCodeForTokens(authorizationCode);
    
    if (success) {
      console.log('Authentication successful! Tokens stored.');
      // Refresh the page to start fresh with tokens
      window.location.reload();
      return true;
    } else {
      console.error('Failed to exchange code for tokens');
      // Clear any partially stored tokens
      clearTokens();
      return false;
    }
  } else {
    console.log('No authorization code found in URL');
    return false;
  }
}

// Exchange authorization code for tokens via Lambda
async function exchangeCodeForTokens(authorizationCode) {
  try {
    console.log('Exchanging authorization code for tokens...');
    
    const response = await fetch(CONFIG.tokenExchangeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        code: authorizationCode,
        redirectUri: CONFIG.redirectUri // Make sure to send this if your backend needs it
      })
    });
    
    // Log response status for debugging
    console.log('Token exchange response status:', response.status);
    
    // Parse the JSON response
    const data = await response.json();
    
    console.log('Token exchange response received');
    
    if (response.ok) {
      console.log('Token exchange successful');
      
      // Store the tokens securely
      storeTokens(
        data.idToken, 
        data.accessToken, 
        data.refreshToken, 
        data.expiresIn || 3600
      );
      
      return true;
    } else {
      console.error('Token exchange failed:', data.error, data.details || '');
      return false;
    }
  } catch (error) {
    console.error('Token exchange error:', error);
    return false;
  }
}

// Initialize authentication
async function initAuth() {
  console.log('Initializing authentication...');
  const appDiv = document.getElementById('app');
  const loadingDiv = document.getElementById('loading');
  
  try {
    // First check if we're in the middle of a code exchange
    const urlParams = new URLSearchParams(window.location.search);
    const authCode = urlParams.get('code');
    
    if (authCode) {
      console.log('Code found in URL, handling authentication redirect');
      const success = await handleAuthenticationRedirect();
      
      // Wait a moment for tokens to be properly stored
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (success && isAuthenticated()) {
        console.log('Authentication successful, showing app');
        if (appDiv) appDiv.style.display = 'block';
        if (loadingDiv) loadingDiv.style.display = 'none';
        return true;
      }
    }
    
    // Check if user is already authenticated
    if (isAuthenticated()) {
      console.log('User already authenticated, showing app');
      if (appDiv) appDiv.style.display = 'block';
      if (loadingDiv) loadingDiv.style.display = 'none';
      setupTokenRefresh(); // Setup refresh if authenticated
      return true;
    }
    
    // Special handling - if we just completed a Cognito logout
    // This check helps break the Cognito session loop
    if (urlParams.has('logout') || urlParams.has('signout')) {
      // Now redirect to actual login
      const loginUrl = `${CONFIG.cognitoUrl}/login?client_id=${CONFIG.clientId}&response_type=code&scope=${CONFIG.scope}&redirect_uri=${encodeURIComponent(CONFIG.redirectUri)}`;
      window.location.href = loginUrl;
      return false;
    }
    
    // Not authenticated and no code, redirect to login
    console.log('User not authenticated, redirecting to login');
    redirectToLogin();
    return false;
  } catch (error) {
    console.error('Authentication error:', error);
    
    if (loadingDiv) {
      loadingDiv.innerHTML = `
        <div class="error-message">
          <h3>Authentication Error</h3>
          <p>${error.message}</p>
          <button onclick="window.Auth.redirectToLogin()">Try Again</button>
        </div>
      `;
    }
    
    return false;
  }
}

// Auto refresh the token before it expires
function setupTokenRefresh() {
  const expiration = localStorage.getItem('tokenExpiration');
  if (!expiration) return;
  
  const expirationTime = parseInt(expiration);
  const now = new Date().getTime();
  const timeUntilExpiry = expirationTime - now;
  
  // If token expires in less than 5 minutes, refresh it now
  if (timeUntilExpiry < 300000) {
    refreshToken();
    return;
  }
  
  // Otherwise, set timeout to refresh 5 minutes before expiry
  const refreshTime = timeUntilExpiry - 300000;
  setTimeout(refreshToken, refreshTime);
}

// Refresh the token using the refresh token
async function refreshToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    redirectToLogin();
    return;
  }
  
  try {
    // This would be another endpoint in your Lambda
    // For now, just redirect to login if token is expired
    redirectToLogin();
  } catch (error) {
    console.error('Token refresh error:', error);
    redirectToLogin();
  }
}

function debugTokens() {
  console.log("Debugging authentication state:");
  console.log("Is authenticated:", isAuthenticated());
  console.log("Token expiration:", localStorage.getItem('tokenExpiration'));
  console.log("Current time:", new Date().getTime());
  console.log("ID token exists:", !!getIdToken());
  console.log("Access token exists:", !!getAccessToken());
  console.log("Refresh token exists:", !!getRefreshToken());
}

// Only run once when the page loads
document.addEventListener('DOMContentLoaded', async () => {
  console.log('DOM loaded, handling authentication...');
  
  // If there's a code in the URL, handle it
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('code')) {
    await handleAuthenticationRedirect();
  }
  
  // Check if we need to initialize the app
  if (typeof initApp === 'function') {
    console.log('Initializing app...');
    initApp();
  }
});

// Export functions to window object
window.Auth = {
  initAuth,
  isAuthenticated,
  getIdToken,
  getAccessToken,
  logout,
  redirectToLogin,
  setupTokenRefresh,
  debugTokens
};
