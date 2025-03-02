// auth.js
// AWS Cognito Authentication Handler

// Configuration - update redirectUri to your GitHub Pages URL when deployed
const CONFIG = {
    cognitoUrl: 'https://eu-north-1bad4kil2h.auth.eu-north-1.amazoncognito.com',
    clientId: 'sufnmmml754ju6m6en2cerr4t',
    redirectUri: 'https://dome877.github.io/testauth/', // Change this when deploying to GitHub Pages
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
  
  // Get ID token from local storage
  function getIdToken() {
    return localStorage.getItem('idToken');
  }
  
  // Get access token from local storage
  function getAccessToken() {
    return localStorage.getItem('accessToken');
  }
  
  // Store tokens in local storage
  function storeTokens(idToken, accessToken, expiresIn = 3600) {
    localStorage.setItem('idToken', idToken);
    localStorage.setItem('accessToken', accessToken);
    const expirationTime = new Date().getTime() + (expiresIn * 1000);
    localStorage.setItem('tokenExpiration', expirationTime.toString());
  }
  
  // Clear tokens from local storage
  function clearTokens() {
    localStorage.removeItem('idToken');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('tokenExpiration');
  }
  
  // Redirect to Cognito login page
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
  
  // Handle the authorization code from URL
  function handleAuthCode(code) {
    console.log("Auth code received:", code);
    
    // Show token input form since we can't exchange code on client-side
    const appDiv = document.getElementById('app');
    const loadingDiv = document.getElementById('loading');
    
    // Create auth message container
    const authMessage = document.createElement('div');
    authMessage.className = 'auth-message';
    authMessage.innerHTML = `
      <h2>Authentication Code Received</h2>
      <p>Since this is a static site, please enter your tokens manually:</p>
      <div class="token-form">
        <div class="form-group">
          <label for="idToken">ID Token:</label>
          <input type="text" id="idToken" placeholder="Enter your ID token">
        </div>
        <div class="form-group">
          <label for="accessToken">Access Token:</label>
          <input type="text" id="accessToken" placeholder="Enter your access token">
        </div>
        <button id="saveTokens">Save Tokens</button>
      </div>
    `;
    
    document.body.appendChild(authMessage);
    if (loadingDiv) loadingDiv.style.display = 'none';
    
    // Add event listener to save tokens button
    document.getElementById('saveTokens').addEventListener('click', function() {
      const idToken = document.getElementById('idToken').value;
      const accessToken = document.getElementById('accessToken').value;
      
      if (idToken && accessToken) {
        storeTokens(idToken, accessToken);
        authMessage.remove();
        if (appDiv) appDiv.style.display = 'block';
      } else {
        alert('Please enter both tokens');
      }
    });
    
    // Remove code from URL
    window.history.replaceState({}, document.title, window.location.pathname);
  }
  
  // Initialize authentication
  function initAuth() {
    // Check for authorization code in URL
    const urlParams = new URLSearchParams(window.location.search);
    const authCode = urlParams.get('code');
    
    if (authCode) {
      // Handle the authorization code
      handleAuthCode(authCode);
      return false;
    }
    
    // Check if user is already authenticated
    if (isAuthenticated()) {
      return true;
    }
    
    // Not authenticated, redirect to login
    redirectToLogin();
    return false;
  }
  
  // Export functions to window object
  window.Auth = {
    initAuth,
    isAuthenticated,
    getIdToken,
    getAccessToken,
    logout,
    redirectToLogin
  };
  