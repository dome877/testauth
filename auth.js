// Configuration
const CONFIG = {
  cognitoUrl: 'https://eu-north-1bad4kil2h.auth.eu-north-1.amazoncognito.com',
  clientId: 'sufnmmml754ju6m6en2cerr4t',
  redirectUri: window.location.origin + window.location.pathname,
  tokenExchangeUrl: 'https://0izwpxiog3.execute-api.eu-north-1.amazonaws.com/prod/token-exchange',
  scope: 'email openid phone'
};

// Storage functions
function getIdToken() { return localStorage.getItem('idToken'); }
function getAccessToken() { return localStorage.getItem('accessToken'); }
function getRefreshToken() { return localStorage.getItem('refreshToken'); }
function isAuthenticated() { return !!getIdToken() && !isTokenExpired(); }

function isTokenExpired() {
  const expiration = localStorage.getItem('tokenExpiration');
  if (!expiration) return true;
  return new Date().getTime() > parseInt(expiration);
}

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

// Redirect functions
function redirectToLogin() {
  const loginUrl = `${CONFIG.cognitoUrl}/login?client_id=${CONFIG.clientId}&response_type=code&scope=${CONFIG.scope}&redirect_uri=${encodeURIComponent(CONFIG.redirectUri)}`;
  window.location.href = loginUrl;
}

function logout() {
  clearTokens();
  const logoutUrl = `${CONFIG.cognitoUrl}/logout?client_id=${CONFIG.clientId}&logout_uri=${encodeURIComponent(CONFIG.redirectUri)}`;
  window.location.href = logoutUrl;
}

// Token exchange - FIXED to handle API Gateway formats
async function exchangeCodeForTokens(authorizationCode) {
  try {
    console.log('Exchanging authorization code for tokens...', {codeLength: authorizationCode?.length});
    
    // Format for Lambda with proxy integration
    const payload = JSON.stringify({ code: authorizationCode });
    console.log('Payload being sent:', payload);
    
    const response = await fetch(CONFIG.tokenExchangeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: payload
    });

    console.log('Token exchange response status:', response.status);
    
    const data = await response.json();
    console.log('Full token response:', data);
    
    // Handle different response formats based on API Gateway configuration
    let tokens;
    if (data.body) {
      // If using proxy integration, data includes statusCode, headers, body
      tokens = typeof data.body === 'string' ? JSON.parse(data.body) : data.body;
    } else {
      // If API Gateway doesn't use proxy integration
      tokens = data;
    }
    console.log('Parsed tokens structure:', tokens);
    
    // Check for errors
    if (tokens.error) {
      console.error('Token exchange failed:', tokens.error);
      return false;
    }
    
    // Make sure tokens exist before proceeding
    if (!tokens.idToken && !tokens.id_token) {
      console.error('Required tokens not found in response');
      return false;
    }
    
    // Store tokens (handle different property names)
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

// Single unified auth initialization
async function initAuth() {
  const appDiv = document.getElementById('app');
  const loadingDiv = document.getElementById('loading');
  
  try {
    // Check for authorization code in URL
    const urlParams = new URLSearchParams(window.location.search);
    const authCode = urlParams.get('code');
    
    if (authCode) {
      console.log('Authorization code found in URL. Length:', authCode.length);
      
      // Remove code from URL (for security)
      window.history.replaceState({}, document.title, window.location.pathname);
      
      // Exchange code for tokens
      const success = await exchangeCodeForTokens(authCode);
      
      if (success) {
        // Show application
        if (appDiv) appDiv.style.display = 'block';
        if (loadingDiv) loadingDiv.style.display = 'none';
        return true;
      }
    }
    
    // Check if user is already authenticated
    if (isAuthenticated()) {
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

// Export functions
window.Auth = {
  initAuth,
  isAuthenticated,
  getIdToken,
  getAccessToken,
  logout,
  redirectToLogin
};

// Run auth initialization when DOM is loaded
document.addEventListener('DOMContentLoaded', initAuth);
