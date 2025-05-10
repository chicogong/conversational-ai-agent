/**
 * API services for TRTC AI conversation
 */

const API_ENDPOINTS = {
  GET_CREDENTIALS: '/credentials',
  START_CONVERSATION: '/conversations',
  STOP_CONVERSATION: '/conversations'
};

/**
 * Makes an API request to the server
 * @param {string} endpoint - API endpoint
 * @param {Object} data - Request payload
 * @param {string} [method="POST"] - HTTP method to use
 * @returns {Promise<Object>} API response
 */
async function apiRequest(endpoint, data, method = "POST") {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: method,
      headers: {
        "Content-Type": "application/json",
      },
      body: typeof data === 'string' ? data : JSON.stringify(data)
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => `Status ${response.status}`);
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`API request failed for ${endpoint}:`, error);
    throw error;
  }
}

/**
 * Fetches user information from the server
 * @param {string} agentId - The agent ID to use for the conversation
 * @returns {Promise<Object>} The user info object
 */
async function getUserInfo(agentId) {
  if (!agentId) {
    throw new Error('Agent ID is required');
  }
  
  const userInfo = await apiRequest(API_ENDPOINTS.GET_CREDENTIALS, { agentId });
  console.log('User info retrieved successfully');
  return userInfo;
}

/**
 * Initializes the chat configuration
 * @param {string} [agentId] - Optional agent ID to include in user info
 * @returns {Promise<Object>} Object containing user info
 */
async function initChatConfig(agentId) {
  if (!agentId) {
    throw new Error('Agent ID is required for chat configuration');
  }
  
  // Get user info from server with the specified agent
  const userInfo = await getUserInfo(agentId);
  
  // Add agent info to ensure it's passed in the conversation request
  userInfo.agent = agentId;
  console.log('Chat config initialized with agent:', agentId);
  
  return { userInfo };
}

/**
 * API call to start the AI conversation
 * @param {string} data - The user information for the conversation (stringified JSON)
 * @returns {Promise<Object>} The API response
 */
async function startAIConversation(data) {
  console.log('Starting AI conversation with data:', data);
  return apiRequest(API_ENDPOINTS.START_CONVERSATION, data);
}

/**
 * API call to stop the AI conversation
 * @param {string} data - The task information to stop (stringified JSON)
 * @returns {Promise<Object>} The API response
 */
async function stopAIConversation(data) {
  return apiRequest(API_ENDPOINTS.STOP_CONVERSATION, data, "DELETE");
} 