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
 * Loads and displays information about the selected agent from cache
 * @param {string} agentId - The ID of the selected agent
 */
function showAgentInfo(agentId) {
  try {
    // Don't load agent info if no agent is selected
    if (!agentId) {
      console.log('No agent selected, skipping agent info display');
      return;
    }
    
    // Check if we have agent info in cache
    if (!appState.agentsCache[agentId]) {
      console.error(`Agent info not found in cache for: ${agentId}`);
      addSystemMessage(`Could not display agent information for: ${agentId}`);
      return;
    }
    
    // Update the agent card with cached info
    updateAgentCard(appState.agentsCache[agentId]);
    console.log(`Displayed agent info for: ${agentId} from cache`);
  } catch (error) {
    console.error('Failed to display agent info:', error);
    addSystemMessage(`Failed to display agent: ${error.message}`);
  }
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
 * Loads all available agents from the server with their complete information
 */
async function loadAllAgentsInfo() {
  try {
    const agentSelect = document.getElementById('agent-select');
    
    if (!agentSelect) return;
    
    // Disable start button until agents are loaded
    if (elements.startButton) {
      elements.startButton.disabled = true;
      elements.startButton.title = "Loading agents...";
    }
    
    // Clear chat list to remove any existing agent cards
    if (elements.chatList) {
      elements.chatList.innerHTML = '';
    }
    
    // Set loading state
    agentSelect.setAttribute('data-loading', 'true');
    agentSelect.disabled = true;
    
    // Clear existing options
    agentSelect.innerHTML = '';
    
    // Add loading option
    const loadingOption = document.createElement('option');
    loadingOption.disabled = true;
    loadingOption.selected = true;
    loadingOption.textContent = 'Loading agents...';
    agentSelect.appendChild(loadingOption);
    
    // Fetch all agents info from server
    const response = await fetch(`${API_BASE_URL}/getAllAgentsInfo`);
    if (!response.ok) {
      throw new Error(`Failed to fetch agents info: ${response.status}`);
    }
    
    const data = await response.json();
    const agentsData = data.agents || {};
    const agentIds = Object.keys(agentsData);
    
    // Store all agent info in cache
    appState.agentsCache = agentsData;
    
    // Remove loading state
    agentSelect.removeAttribute('data-loading');
    agentSelect.disabled = false;
    
    // Clear loading option
    agentSelect.innerHTML = '';
    
    if (agentIds.length === 0) {
      const noAgentsOption = document.createElement('option');
      noAgentsOption.disabled = true;
      noAgentsOption.textContent = 'No agents available';
      agentSelect.appendChild(noAgentsOption);
      
      // Keep start button disabled
      if (elements.startButton) {
        elements.startButton.disabled = true;
        elements.startButton.title = "No agents available";
      }
      
      // Show message in chat
      addSystemMessage("No AI assistants available. Please try again later.");
      return;
    }
    
    // Add agents to select dropdown
    agentIds.forEach(agentId => {
      const agent = agentsData[agentId];
      const option = document.createElement('option');
      option.value = agentId;
      option.textContent = agent.name;
      agentSelect.appendChild(option);
    });
    
    // Automatically select the first agent
    if (agentIds.length > 0) {
      appState.selectedAgent = agentIds[0];
      agentSelect.value = appState.selectedAgent;
      
      // Enable start button
      if (elements.startButton) {
        elements.startButton.disabled = false;
        elements.startButton.title = "";
      }
      
      // Display the first agent's information from cache
      showAgentInfo(appState.selectedAgent);
    }
    
    console.log(`Loaded ${agentIds.length} agents, selected: ${appState.selectedAgent}`);
  } catch (error) {
    console.error('Failed to load agents info:', error);
    const agentSelect = document.getElementById('agent-select');
    
    if (agentSelect) {
      // Remove loading state
      agentSelect.removeAttribute('data-loading');
      agentSelect.disabled = false;
      
      agentSelect.innerHTML = '';
      const errorOption = document.createElement('option');
      errorOption.disabled = true;
      errorOption.selected = true;
      errorOption.textContent = 'Error loading agents';
      agentSelect.appendChild(errorOption);
    }
    
    // Keep start button disabled
    if (elements.startButton) {
      elements.startButton.disabled = true;
      elements.startButton.title = "Failed to load agents";
    }
    
    // Add error message to chat
    addSystemMessage(`Failed to load agents: ${error.message}`);
  }
}

/**
 * Initialize the application
 */
function initializeApp() {
  // Get DOM elements
  const agentSelect = document.getElementById('agent-select');
  
  // Set up agent selection handling
  agentSelect.addEventListener('change', (e) => {
    appState.selectedAgent = e.target.value;
    
    // Enable start button once an agent is selected
    if (elements.startButton && appState.selectedAgent) {
      elements.startButton.disabled = false;
      elements.startButton.title = "";
    }
    
    // Display agent info from cache
    showAgentInfo(appState.selectedAgent);
  });
  
  // Load all agents info from server
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