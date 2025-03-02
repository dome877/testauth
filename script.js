document.addEventListener('DOMContentLoaded', async function() {
    // Get DOM elements
    const fetchBtn = document.getElementById('fetchBtn');
    const clearBtn = document.getElementById('clearBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const resultDiv = document.getElementById('result');
    const statusSpan = document.getElementById('status');
    const timestampSpan = document.getElementById('timestamp');
    
    // Initialize authentication (async)
    const isAuthenticated = await window.Auth.initAuth();
    
    // Setup token refresh mechanism
    if (isAuthenticated) {
        window.Auth.setupTokenRefresh();
        
        // Add event listeners
        fetchBtn.addEventListener('click', fetchData);
        clearBtn.addEventListener('click', clearResults);
        logoutBtn.addEventListener('click', window.Auth.logout);
    }
    
    // Function to fetch data from the API
    function fetchData() {
        // Update UI for loading state
        fetchBtn.disabled = true;
        resultDiv.innerHTML = '<p class="loading">Loading data...</p>';
        resultDiv.className = '';
        statusSpan.textContent = 'Fetching data...';
        
        // API endpoint
        const apiUrl = 'https://13c2qite21.execute-api.eu-north-1.amazonaws.com/dev/test';
        
        // Get auth token
        const idToken = window.Auth.getIdToken();
        
        // Fetch data from API with authorization header
        fetch(apiUrl, {
            headers: {
                'Authorization': `Bearer ${idToken}`
            }
        })
            .then(response => {
                if (!response.ok) {
                    if (response.status === 401 || response.status === 403) {
                        // Token might be invalid or expired
                        window.Auth.redirectToLogin();
                        throw new Error('Authentication required');
                    }
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                // Display the data
                resultDiv.innerHTML = '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
                resultDiv.className = 'success';
                statusSpan.textContent = 'Data fetched successfully';
                
                // Update timestamp
                updateTimestamp();
            })
            .catch(error => {
                // Handle errors
                resultDiv.innerHTML = `<p>Error fetching data: ${error.message}</p>`;
                resultDiv.className = 'error';
                statusSpan.textContent = 'Error occurred';
                console.error('Fetch error:', error);
                
                // Update timestamp
                updateTimestamp();
            })
            .finally(() => {
                // Re-enable button
                fetchBtn.disabled = false;
            });
    }
    
    // Function to clear results
    function clearResults() {
        resultDiv.innerHTML = '<p>API response will appear here...</p>';
        resultDiv.className = '';
        statusSpan.textContent = 'Ready';
    }
    
    // Function to update timestamp
    function updateTimestamp() {
        const now = new Date();
        timestampSpan.textContent = now.toLocaleString();
    }
});
