// auth.js - Improved with debugging
const CONFIG = {
    cognitoUrl: 'https://eu-north-1bad4kil2h.auth.eu-north-1.amazoncognito.com',
    clientId: 'sufnmmml754ju6m6en2cerr4t',
    // Using dynamic current URL as redirect
    redirectUri: window.location.origin + window.location.pathname,
    scope: 'email openid phone'
  };
  
  // Debug function to show messages on screen
  function showDebug(message) {
    console.log('[Auth Debug]', message);
    
    const debugDiv = document.getElementById('debug-msg') || (() => {
      const div = document.createElement('div');
      div.id = 'debug-msg';
      div.style.backgroundColor = '#f8d7da';
      div.style.color = '#721c24';
      div.style.padding = '10px';
      div.style.margin = '10px';
      div.style.borderRadius = '4px';
      document.body.appendChild(div);
      return div;
    })();
    
    debugDiv.innerHTML += message + '<br>';
  }
  
  // Check if user is authenticated
  function isAuthenticated() {
    showDebug("Checking if authenticated...");
    return !!getIdToken() && !isTokenExpired();
  }
  
  // Check if token is expired
  function isTokenExpired() {
    const expiration = localStorage.getItem('tokenExpiration');
    if (!expiration) return true;
    return new Date().getTime() > parseInt(expiration);
  }
  
  // Get ID token
  function getIdToken() {
    return localStorage.getItem('idToken');
  }
  
  // Get access token
  function getAccessToken() {
    return localStorage.getItem('accessToken');
  }
  
  // Store tokens
  function storeTokens(idToken, accessToken, expiresIn = 3600) {
    localStorage.setItem('idToken', idToken);
    localStorage.setItem('accessToken', accessToken);
    const expirationTime = new Date().getTime() + (expiresIn * 1000);
    localStorage.setItem('tokenExpiration', expirationTime.toString());
  }
  
  // Clear tokens
  function clearTokens() {
    localStorage.removeItem('idToken');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('tokenExpiration');
  }
  
  // Redirect to login page
  function redirectToLogin() {
    showDebug("Redirecting to login...");
    const loginUrl = `${CONFIG.cognitoUrl}/login?client_id=${CONFIG.clientId}&response_type=code&scope=${CONFIG.scope}&redirect_uri=${encodeURIComponent(CONFIG.redirectUri)}`;
    showDebug("Login URL: " + loginUrl);
    
    // Add a button to manually redirect (helps with debugging)
    const redirectBtn = document.createElement('button');
    redirectBtn.innerText = "Click to login";
    redirectBtn.style.padding = "10px";
    redirectBtn.style.margin = "10px";
    redirectBtn.addEventListener('click', () => window.location.href = loginUrl);
    document.body.appendChild(redirectBtn);
    
    // Also try automatic redirect after 2 seconds
    setTimeout(() => {
      window.location.href = loginUrl;
    }, 2000);
  }
  
  // Logout user
  function logout() {
    clearTokens();
    const logoutUrl = `${CONFIG.cognitoUrl}/logout?client_id=${CONFIG.clientId}&logout_uri=${encodeURIComponent(CONFIG.redirectUri)}`;
    window.location.href = logoutUrl;
  }
  
  // Handle authorization code
  function handleAuthCode(code) {
    showDebug("Auth code received, waiting for tokens...");
    
    const appDiv = document.getElementById('app');
    const loadingDiv = document.getElementById('loading');
    
    // Create auth form
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
    showDebug("Starting auth process...");
    
    try {
      // Check for authorization code in URL
      const urlParams = new URLSearchParams(window.location.search);
      const authCode = urlParams.get('code');
      
      if (authCode) {
        showDebug("Found auth code in URL");
        handleAuthCode(authCode);
        return false;
      }
      
      // Check if user is already authenticated
      if (isAuthenticated()) {
        showDebug("User is authenticated!");
        return true;
      }
      
      // Not authenticated, redirect to login
      showDebug("User is not authenticated");
      redirectToLogin();
      return false;
    } catch (error) {
      showDebug(`Error: ${error.message}`);
      console.error(error);
      return false;
    }
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
  