// simpler-auth.js
const cognitoUrl = 'https://eu-north-1bad4kil2h.auth.eu-north-1.amazoncognito.com';
const clientId = 'sufnmmml754ju6m6en2cerr4t';
const redirectUri = window.location.origin + window.location.pathname;

// Check for presence of tokens (simplified check)
const isLoggedIn = !!localStorage.getItem('isLoggedIn');

function checkAuth() {
  // Check if user just returned from login
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('code')) {
    // User has logged in, clean URL and set flag
    localStorage.setItem('isLoggedIn', 'true');
    window.history.replaceState({}, document.title, window.location.pathname);
    return true;
  }
  
  return isLoggedIn;
}

function redirectToLogin() {
  const loginUrl = `${cognitoUrl}/login?client_id=${clientId}&response_type=code&scope=email+openid+phone&redirect_uri=${encodeURIComponent(redirectUri)}`;
  window.location.href = loginUrl;
}

function logout() {
  localStorage.removeItem('isLoggedIn');
  const logoutUrl = `${cognitoUrl}/logout?client_id=${clientId}&logout_uri=${encodeURIComponent(redirectUri)}`;
  window.location.href = logoutUrl;
}

// Initialize and export functions
window.Auth = { 
  init: function() {
    const authenticated = checkAuth();
    if (!authenticated) {
      redirectToLogin();
      return false;
    }
    return true;
  },
  logout: logout
};
