// Production auth.js for GitHub Pages with AWS Lambda token exchange

// Configuration
const CONFIG = {
    cognitoUrl: 'https://eu-north-1bad4kil2h.auth.eu-north-1.amazoncognito.com',
    clientId: 'sufnmmml754ju6m6en2cerr4t',
    redirectUri: window.location.origin + window.location.pathname,
    tokenExchangeUrl: 'https://0izwpxiog3.execute-api.eu-north-1.amazonaws.com/prod/token-exchange', // Update with your API Gateway URL
    scope: 'email openid phone'
  };
  
  // Check if user is authenticated
  function isAuthenticated() {
    return !!getIdToken() && !isTokenExpired();
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
  
  // Redirect to Cognito login
  function redirectToLogin() {
    const loginUrl = `${CONFIG.cognitoUrl}/login?client_id=${CONFIG.clientId}&response_type=code&scope=${CONFIG.scope}&redirect_uri=${encodeURIComponent(CONFIG.redirectUri)}`;
    window.location.href = loginUrl;
  }
  
  // Logout user
  function logout() {
    clearTokens();
    const logoutUrl = `${CONFIG.cognitoUrl}/logout?client_id=${CONFIG.clientId}&logout_uri=${encodeURIComponent(CONFIG.redirectUri)}`;
    window.location.href = logoutUrl;
  }
  
// Update your exchangeCodeForTokens function with debugging
async function exchangeCodeForTokens(authorizationCode) {
    try {
      const response = await fetch(CONFIG.tokenExchangeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          code: authorizationCode
        })
      });
      

      return true;
    } catch (error) {
      console.error('Token exchange error:', error);
      return false;
    }
  }
  
  
  // Initialize authentication
  async function initAuth() {
    const appDiv = document.getElementById('app');
    const loadingDiv = document.getElementById('loading');
    
    try {
      // Check for authorization code in URL
      const urlParams = new URLSearchParams(window.location.search);
      const authCode = urlParams.get('code');
      
      if (authCode) {
        // Remove code from URL (for security)
        window.history.replaceState({}, document.title, window.location.pathname);
        
        // Exchange code for tokens
        const success = await exchangeCodeForTokens(authCode);
        
        if (success) {
          // Show application
          if (appDiv) appDiv.style.display = 'block';
          if (loadingDiv) loadingDiv.style.display = 'none';
          return true;
        } else {
          return false;
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
  
  // Export functions to window object
  window.Auth = {
    initAuth,
    isAuthenticated,
    getIdToken,
    getAccessToken,
    logout,
    redirectToLogin,
    setupTokenRefresh
  };
  

  function debugTokens() {
    console.log("Checking all possible token locations:");
    
    // Check localStorage with different possible key names
    const localStorageKeys = ["idToken", "id_token", "token", "auth", "authentication"];
    localStorageKeys.forEach(key => {
      const value = localStorage.getItem(key);
      if (value) console.log(`Found in localStorage['${key}']: ${value.substring(0, 10)}...`);
    });
    
    // Check sessionStorage
    const sessionStorageKeys = ["idToken", "id_token", "token", "auth", "authentication"];
    sessionStorageKeys.forEach(key => {
      const value = sessionStorage.getItem(key);
      if (value) console.log(`Found in sessionStorage['${key}']: ${value.substring(0, 10)}...`);
    });
    
    // Look for common objects in window scope
    if (window.auth && window.auth.token) console.log("Found in window.auth.token");
    if (window.authToken) console.log("Found in window.authToken");
    
    // Check document cookies
    console.log("Cookies:", document.cookie);
  }