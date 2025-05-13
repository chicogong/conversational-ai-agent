/**
 * Main application file for TRTC-AI Conversation
 */

// Application state
const appState = {
  taskId: null,
  muteState: false,
  selectedAgent: null,
  agentsCache: {} // Cache to store all agent information
};

/**
 * ===========================================
 * MAIN APPLICATION FUNCTIONS
 * ===========================================
 */

/**
 * Starts the conversation with the AI
 */
async function startConversation() {
  try {
    // Validate agent selection
    if (!appState.selectedAgent) {
      addSystemMessage("Please select an AI assistant first");
      return;
    }
    
    // Disable start button while connecting
    elements.startButton.disabled = true;
    updateStatus('room', "Connecting...");

    // Get user info from API module with selected agent
    const { userInfo } = await initChatConfig(appState.selectedAgent);
    
    const { sdkAppId, userSig, userId, roomId, robotId } = userInfo;

    // Save user information
    setUserIds(userId, robotId);

    // Enter the TRTC room
    await enterTRTCRoom({
      roomId,
      sdkAppId,
      userId,
      userSig
    });

    updateStatus('room', "✅ Connected");

    // Start AI conversation - Fix: Pass userInfo directly without extra nesting
    const response = await startAIConversation(JSON.stringify({ userInfo }));
    appState.taskId = response.TaskId;
    console.log('AI conversation started with task ID:', appState.taskId);

    // Enable control buttons
    elements.endButton.disabled = false;
    elements.sendButton.disabled = false;
    elements.interruptButton.disabled = false;
    elements.muteButton.disabled = false;

    // Add call-active class to hide agent selection
    document.getElementById('app').classList.add('call-active');
  } catch (error) {
    console.error("Failed to start conversation:", error);
    updateStatus('room', "Connection Failed");
    elements.startButton.disabled = false;

    // Display error in chat
    addSystemMessage(`Failed to start conversation: ${error.message}`);
  }
}

/**
 * Stops the conversation with the AI
 */
async function stopConversation() {
  // Disable buttons while disconnecting
  elements.endButton.disabled = true;
  elements.sendButton.disabled = true;
  elements.interruptButton.disabled = true;
  elements.muteButton.disabled = true;
  elements.muteButton.textContent = 'Mute';
  elements.muteButton.classList.remove('muted');
  appState.muteState = false;
  updateStatus('room', "Disconnecting...");

  try {
    // Stop the AI conversation task
    if (appState.taskId) {
      await stopAIConversation(JSON.stringify({
        TaskId: appState.taskId,
      }));
      console.log('AI conversation stopped successfully');
    }
  } catch (error) {
    console.error('Error stopping AI conversation:', error);
  }

  try {
    // Exit the TRTC room
    await exitTRTCRoom();
  } catch (error) {
    console.error('Error exiting TRTC room:', error);
  }

  // Display metrics statistics
  displayLatencyStatistics();
  
  // Clean up resources
  destroyTRTCClient();

  // Reset UI state and metrics data
  appState.taskId = null;
  resetMetrics();
  resetUI();

  // Remove call-active class to show agent selection
  document.getElementById('app').classList.remove('call-active');
}

/**
 * ===========================================
 * UI INTERACTION FUNCTIONS
 * ===========================================
 */

/**
 * Displays information about the selected agent
 * @param {string} agentId - The ID of the selected agent
 */
function showAgentInfo(agentId) {
  if (!agentId || !appState.agentsCache[agentId]) {
    console.error(`Agent info not available for: ${agentId}`);
    return;
  }
  
  // Update the agent card with cached info
  updateAgentCard(appState.agentsCache[agentId]);
}

/**
 * Send a text message from the input field
 */
function handleSendMessage() {
  if (sendCustomTextMessage(elements.textInput.value)) {
    elements.textInput.value = ""; // Clear the input field
  }
}

/**
 * Toggle mute state
 */
async function handleToggleMute() {
  appState.muteState = !appState.muteState;
  const success = await toggleMute(appState.muteState);
  if (success) {
    elements.muteButton.textContent = appState.muteState ? 'Unmute' : 'Mute';
    // Update the before content using a CSS class
    if (appState.muteState) {
      elements.muteButton.classList.add('muted');
    } else {
      elements.muteButton.classList.remove('muted');
    }
  }
}

/**
 * ===========================================
 * INITIALIZATION AND EVENT LISTENERS
 * ===========================================
 */

/**
 * Loads all available agents from the server
 */
async function loadAllAgentsInfo() {
  const agentSelect = document.getElementById('agent-select');
  if (!agentSelect) return;
  
  try {
    // Set loading state
    agentSelect.innerHTML = '<option disabled selected>Loading agents...</option>';
    agentSelect.setAttribute('data-loading', 'true');
    agentSelect.disabled = true;
    elements.startButton.disabled = true;
    elements.chatList.innerHTML = '';
    
    // Fetch agents from server
    const response = await fetch(`${API_BASE_URL}/agents`);
    if (!response.ok) throw new Error(`Failed to fetch agents: ${response.status}`);
    
    const data = await response.json();
    const agentsData = data.agents || {};
    const agentIds = Object.keys(agentsData);
    
    // Store agent data in cache
    appState.agentsCache = agentsData;
    
    // Clear loading state
    agentSelect.removeAttribute('data-loading');
    agentSelect.disabled = false;
    agentSelect.innerHTML = '';
    
    if (agentIds.length === 0) {
      agentSelect.innerHTML = '<option disabled>No agents available</option>';
      elements.startButton.disabled = true;
      elements.startButton.title = "No agents available";
      addSystemMessage("No AI assistants available. Please try again later.");
      return;
    }
    
    // Populate dropdown
    agentIds.forEach(agentId => {
      const option = document.createElement('option');
      option.value = agentId;
      option.textContent = agentsData[agentId].name;
      agentSelect.appendChild(option);
    });
    
    // Select first agent
    appState.selectedAgent = agentIds[0];
    agentSelect.value = appState.selectedAgent;
    elements.startButton.disabled = false;
    
    // Display agent info
    showAgentInfo(appState.selectedAgent);
    updateAgentNavButtons();
    
    console.log(`Loaded ${agentIds.length} agents`);
  } catch (error) {
    console.error('Failed to load agents:', error);
    
    // Handle error state
    agentSelect.innerHTML = '<option disabled selected>Error loading agents</option>';
    agentSelect.removeAttribute('data-loading');
    agentSelect.disabled = false;
    elements.startButton.disabled = true;
    elements.startButton.title = "Failed to load agents";
    
    addSystemMessage(`Failed to load agents: ${error.message}`);
  }
}

/**
 * Changes agent selection in the dropdown
 * @param {number} direction - Direction to change (-1 for previous, 1 for next)
 */
function changeAgentSelection(direction) {
  const agentSelect = document.getElementById('agent-select');
  if (!agentSelect || agentSelect.disabled) return;
  
  const options = agentSelect.options;
  const currentIndex = agentSelect.selectedIndex;
  const newIndex = currentIndex + direction;
  
  // Check if new index is valid
  if (newIndex >= 0 && newIndex < options.length) {
    agentSelect.selectedIndex = newIndex;
    
    // Update application state
    appState.selectedAgent = agentSelect.value;
    
    // Display agent info and update UI
    showAgentInfo(appState.selectedAgent);
    updateAgentNavButtons();
    
    // Enable start button
    if (elements.startButton) {
      elements.startButton.disabled = false;
      elements.startButton.title = "";
    }
  }
}

/**
 * Updates the enabled/disabled state of the navigation buttons
 */
function updateAgentNavButtons() {
  const agentSelect = document.getElementById('agent-select');
  const prevButton = document.getElementById('prev-agent-btn');
  const nextButton = document.getElementById('next-agent-btn');
  
  if (!agentSelect || !prevButton || !nextButton) return;
  
  // Disable prev button if we're at the first option
  prevButton.disabled = agentSelect.selectedIndex <= 0;
  
  // Disable next button if we're at the last option
  nextButton.disabled = agentSelect.selectedIndex >= agentSelect.options.length - 1;
}

/**
 * Initialize the application
 */
function initializeApp() {
  // Get DOM elements
  const agentSelect = document.getElementById('agent-select');
  const prevAgentBtn = document.getElementById('prev-agent-btn');
  const nextAgentBtn = document.getElementById('next-agent-btn');
  
  // Set up agent selection handling
  agentSelect.addEventListener('change', () => {
    appState.selectedAgent = agentSelect.value;
    
    // Enable start button
    if (elements.startButton) {
      elements.startButton.disabled = false;
      elements.startButton.title = "";
    }
    
    // Display agent info
    showAgentInfo(appState.selectedAgent);
    
    // Update navigation buttons
    updateAgentNavButtons();
  });
  
  // Set up agent navigation buttons
  if (prevAgentBtn) prevAgentBtn.addEventListener('click', () => changeAgentSelection(-1));
  if (nextAgentBtn) nextAgentBtn.addEventListener('click', () => changeAgentSelection(1));
  
  // Load all agents info
  loadAllAgentsInfo();
  
  // Set up main button event listeners
  elements.startButton.addEventListener('click', startConversation);
  elements.endButton.addEventListener('click', stopConversation);
  elements.sendButton.addEventListener('click', handleSendMessage);
  elements.interruptButton.addEventListener('click', sendInterruptSignal);
  elements.muteButton.addEventListener('click', handleToggleMute);
  
  // Handle Enter key press in text input
  elements.textInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter' && !elements.sendButton.disabled) {
      handleSendMessage();
    }
  });
}

// Initialize when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', initializeApp); 