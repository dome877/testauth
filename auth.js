// auth.js - Complete authentication handling for Cognito with Lambda token exchange

// Configuration 
const CONFIG = {
  cognitoUrl: 'https://eu-north-1bad4kil2h.auth.eu-north-1.amazoncognito.com',
  clientId: 'sufnmmml754ju6m6en2cerr4t',
  redirectUri: window.location.origin + window.location.pathname,
  tokenExchangeUrl: 'https://0izwpxiog3.execute-api.eu-north-1.amazonaws.com/prod/token-exchange',
  scope: 'email openid phone'
};

// Token storage and retrieval functions
function getIdToken() { return localStorage.getItem('idToken'); }
function getAccessToken() { return localStorage.getItem('accessToken'); }
function getRefreshToken() { return localStorage.getItem('refreshToken'); }

function storeTokens(idToken, accessToken, refreshToken, expiresIn = 3600) {
  localStorage.setItem('idToken', idToken);
  localStorage.setItem('accessToken', accessToken);
  if (refreshToken) {
    localStorage.setItem('refreshToken', refreshToken);
  }
  const expirationTime = new Date().getTime() + (expiresIn * 1000);
  localStorage.setItem('tokenExpiration', expirationTime.toString());
}

function clearTokens() {
  localStorage.removeItem('idToken');
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('tokenExpiration');
}

// Authentication state functions
function isAuthenticated() {
  return !!getIdToken() && !isTokenExpired();
}

function isTokenExpired() {
  const expiration = localStorage.getItem('tokenExpiration');
  if (!expiration) return true;
  return new Date().getTime() > parseInt(expiration);
}

// Login/logout navigation
function redirectToLogin() {
  const loginUrl = `${CONFIG.cognitoUrl}/login?client_id=${CONFIG.clientId}&response_type=code&scope=${CONFIG.scope}&redirect_uri=${encodeURIComponent(CONFIG.redirectUri)}`;
  window.location.href = loginUrl;
}

function logout() {
  clearTokens();
  const logoutUrl = `${CONFIG.cognitoUrl}/logout?client_id=${CONFIG.clientId}&logout_uri=${encodeURIComponent(CONFIG.redirectUri)}`;
  window.location.href = logoutUrl;
}

// Token exchange with Lambda
async function exchangeCodeForTokens(authorizationCode) {
  try {
    console.log('Exchanging authorization code for tokens...');
    
    // Create the request payload - this is the critical part that was failing
    const response = await fetch(CONFIG.tokenExchangeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        code: authorizationCode
      })
    });

    console.log('Token exchange response status:', response.status);
    
    const data = await response.json();
    console.log('Full token response:', data);
    
    // Handle different API Gateway response formats
    let tokens;
    
    if (data.body) {
      // API Gateway with proxy integration
      tokens = typeof data.body === 'string' ? JSON.parse(data.body) : data.body;
    } else {
      // API Gateway without proxy integration
      tokens = data;
    }
    
    console.log('Parsed token data:', tokens);
    
    // Check for errors
    if (tokens.error) {
      console.error('Token exchange failed:', tokens.error);
      return false;
    }
    
    // Check for required tokens
    if (!tokens.idToken && !tokens.id_token) {
      console.error('Required tokens not found in response');
      return false;
    }
    
    // Store tokens (handling different property naming conventions)
    storeTokens(
      tokens.idToken || tokens.id_token,
      tokens.accessToken || tokens.access_token,
      tokens.refreshToken || tokens.refresh_token,
      tokens.expiresIn || tokens.expires_in || 3600
    );
    
    console.log('Token exchange successful');
    return true;
  } catch (error) {
    console.error('Token exchange error:', error);
    return false;
  }
}

// Token refresh functionality
function setupTokenRefresh() {
  console.log('Setting up token refresh...');
  
  // Clear any existing refresh timer
  if (window.tokenRefreshTimer) {
    clearTimeout(window.tokenRefreshTimer);
  }
  
  const expiration = localStorage.getItem('tokenExpiration');
  if (!expiration) {
    console.log('No token expiration found, skipping refresh setup');
    return;
  }
  
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
  window.tokenRefreshTimer = setTimeout(refreshToken, refreshTime);
}

async function refreshToken() {
  const refreshTokenValue = getRefreshToken();
  if (!refreshTokenValue) {
    redirectToLogin();
    return;
  }
  
  try {
    // For now, just redirect to login if token needs refresh
    redirectToLogin();
  } catch (error) {
    console.error('Token refresh error:', error);
    redirectToLogin();
  }
}

// Unified initialization function
async function initAuth() {
  const appDiv = document.getElementById('app');
  const loadingDiv = document.getElementById('loading');
  
  try {
    // Check for authorization code in URL
    const urlParams = new URLSearchParams(window.location.search);
    const authCode = urlParams.get('code');
    
    if (authCode) {
      console.log('Authorization code found in URL');
      
      // Remove code from URL for security
      window.history.replaceState({}, document.title, window.location.pathname);
      
      // Exchange code for tokens
      const success = await exchangeCodeForTokens(authCode);
      
      if (success) {
        // Set up token refresh
        setupTokenRefresh();
        
        // Show application
        if (appDiv) appDiv.style.display = 'block';
        if (loadingDiv) loadingDiv.style.display = 'none';
        return true;
      } else {
        throw new Error('Failed to exchange authorization code for tokens');
      }
    }
    
    // Check if user is already authenticated
    if (isAuthenticated()) {
      // Set up token refresh
      setupTokenRefresh();
      
      // Show application
      if (appDiv) appDiv.style.display = 'block';
      if (loadingDiv) loadingDiv.style.display = 'none';
      return true;
    }
    
    // Not authenticated, redirect to login
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

// Debug function (optional)
function debugTokens() {
  console.log("Current token state:");
  console.log("ID Token:", getIdToken() ? "Present" : "None");
  console.log("Access Token:", getAccessToken() ? "Present" : "None");
  console.log("Refresh Token:", getRefreshToken() ? "Present" : "None");
  
  const expiration = localStorage.getItem('tokenExpiration');
  if (expiration) {
    const expirationDate = new Date(parseInt(expiration));
    console.log("Token Expiration:", expirationDate.toLocaleString());
    console.log("Token Expired:", isTokenExpired() ? "Yes" : "No");
  } else {
    console.log("Token Expiration: Not set");
  }
}

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

// Start authentication flow when the DOM is ready
document.addEventListener('DOMContentLoaded', initAuth);
