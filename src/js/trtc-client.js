/**
 * TRTC client module for handling TRTC-specific functionality
 */

// TRTC state
const trtcState = {
  client: null,
  currentUserId: null,
  botUserId: null
};

// TRTC configuration constants
const TRTC_CONFIG = {
  CMD_ID: 2, // Fixed cmdId as per requirement
  VOLUME_EVALUATION_INTERVAL: 50 // 50ms for smoother visualization
};

/**
 * ===========================================
 * TRTC INITIALIZATION AND CORE FUNCTIONALITY
 * ===========================================
 */

/**
 * Initialize TRTC client
 * @returns {Object} The TRTC client instance
 */
function initTRTCClient() {
  if (!trtcState.client) {
    trtcState.client = TRTC.create();
  }
  return trtcState.client;
}

/**
 * Enter TRTC room
 * @param {Object} params - The room parameters
 * @returns {Promise} Promise that resolves when room is entered
 */
async function enterTRTCRoom(params) {
  const client = initTRTCClient();
  await client.enterRoom({
    roomId: parseInt(params.roomId),
    scene: "rtc",
    sdkAppId: params.sdkAppId,
    userId: params.userId,
    userSig: params.userSig,
  });
  
  // Set up event handlers
  client.on(TRTC.EVENT.CUSTOM_MESSAGE, handleTRTCMessage);
  client.on(TRTC.EVENT.AUDIO_VOLUME, handleAudioVolume);
  
  // Enable audio volume evaluation with higher frequency for smoother visualization
  client.enableAudioVolumeEvaluation(TRTC_CONFIG.VOLUME_EVALUATION_INTERVAL);
  
  // Start audio
  await client.startLocalAudio();
  console.log('Local audio started successfully');
  
  return client;
}

/**
 * Exit TRTC room
 * @returns {Promise} Promise that resolves when room is exited
 */
async function exitTRTCRoom() {
  try {
    if (trtcState.client) {
      await trtcState.client.exitRoom();
      console.log('Successfully exited TRTC room');
    }
  } catch (error) {
    console.error('Error exiting TRTC room:', error);
    throw error;
  }
}

/**
 * Destroy TRTC client
 */
function destroyTRTCClient() {
  if (trtcState.client) {
    trtcState.client.destroy();
    trtcState.client = null;
  }
}

/**
 * Set user IDs
 * @param {string} userId - The current user ID
 * @param {string} aiUserId - The AI bot user ID
 */
function setUserIds(userId, aiUserId) {
  trtcState.currentUserId = userId;
  trtcState.botUserId = aiUserId;
}

/**
 * ===========================================
 * AUDIO CONTROL FUNCTIONS
 * ===========================================
 */

/**
 * Toggle mute status for local audio
 * @param {boolean} mute - Whether to mute (true) or unmute (false)
 * @returns {Promise<boolean>} Promise that resolves to success status
 */
async function toggleMute(mute) {
  if (!trtcState.client) return false;
  
  try {
    await trtcState.client.updateLocalAudio({ mute: mute });
    console.log(`Local audio ${mute ? 'muted' : 'unmuted'} successfully`);
    return true;
  } catch (error) {
    console.error('Error toggling mute status:', error);
    return false;
  }
}

/**
 * ===========================================
 * MESSAGING FUNCTIONS
 * ===========================================
 */

/**
 * Creates a message payload with common attributes
 * @param {number} type - Message type from MESSAGE_TYPES
 * @param {Object} payloadData - The payload data
 * @returns {Object} The formatted message payload
 */
function createMessagePayload(type, payloadData) {
  return {
    type: type,
    sender: trtcState.currentUserId,
    receiver: [trtcState.botUserId],
    payload: {
      id: Date.now().toString(),
      timestamp: Date.now(),
      ...payloadData
    }
  };
}

/**
 * Sends a message through the TRTC client
 * @param {Object} payload - The message payload
 * @returns {boolean} Success status
 */
function sendTRTCMessage(payload) {
  if (!trtcState.client) return false;
  
  try {
    trtcState.client.sendCustomMessage({
      cmdId: TRTC_CONFIG.CMD_ID,
      data: new TextEncoder().encode(JSON.stringify(payload)).buffer
    });
    return true;
  } catch (error) {
    console.error("Failed to send TRTC message:", error);
    return false;
  }
}

/**
 * Send a custom text message to the AI
 * @param {string} message - The message to send
 * @returns {boolean} Success status
 */
function sendCustomTextMessage(message) {
  if (!trtcState.client || !message.trim()) return false;
  
  const messageText = message.trim();
  const payload = createMessagePayload(MESSAGE_TYPES.CUSTOM_TEXT, {
    message: messageText
  });
  
  const success = sendTRTCMessage(payload);
  if (success) {
    console.log('Custom text message sent');
  }
  return success;
}

/**
 * Send an interrupt signal to the AI
 * @returns {boolean} Success status
 */
function sendInterruptSignal() {
  if (!trtcState.client) return false;
  
  const payload = createMessagePayload(MESSAGE_TYPES.CUSTOM_INTERRUPT, {});
  
  const success = sendTRTCMessage(payload);
  if (success) {
    console.log('Interrupt signal sent');
  }
  return success;
}

/**
 * ===========================================
 * MESSAGE HANDLERS
 * ===========================================
 */

/**
 * Handles TRTC custom messages
 * @param {Object} event - The TRTC event object
 */
function handleTRTCMessage(event) {
  try {
    const jsonData = new TextDecoder().decode(event.data);
    const data = JSON.parse(jsonData);

    const handlers = {
      [MESSAGE_TYPES.CONVERSATION]: handleConversationMessage,
      [MESSAGE_TYPES.STATE_CHANGE]: handleStateChangeMessage,
      [MESSAGE_TYPES.ERROR_CALLBACK]: handleErrorCallbackMessage,
      [MESSAGE_TYPES.METRICS_CALLBACK]: handleMetricsMessage
    };

    const handler = handlers[data.type];
    if (handler) {
      handler(data);
    } else {
      console.warn(`Unknown message type: ${data.type}`);
    }
  } catch (error) {
    console.error('Error processing TRTC message:', error);
  }
}

/**
 * Handles conversation messages from the AI
 * @param {Object} data - The conversation message data
 */
function handleConversationMessage(data) {
  const { sender, payload } = data;
  const { text, roundid, end } = payload;
  const isRobot = sender.includes('ai_');

  addMessage(
    sender, 
    text, 
    isRobot ? 'ai' : 'user',
    roundid,
    end
  );
}

/**
 * Handles state change messages from the AI
 * @param {Object} data - The state change message data
 */
function handleStateChangeMessage(data) {
  const state = data.payload.state;
  const stateText = STATE_LABELS[state] || "Unknown State";
  updateStatus('ai', stateText);
}

/**
 * Handles error callback messages from the AI service
 * @param {Object} data - The error callback message data
 */
function handleErrorCallbackMessage(data) {
  try {
    const { payload } = data;
    const { metric, tag } = payload;
    const { roundid, code, message: errorMessage } = tag;
    console.error(`AI Service Error: ${metric} (${code}): ${errorMessage}`);
    
    const displayMessage = `${metric} (${code}): ${errorMessage}`;
    addSystemMessage(displayMessage);
  } catch (error) {
    console.error('Error processing error callback:', error);
  }
}

/**
 * Handles metrics messages from the AI service
 * @param {Object} data - The metrics message data
 */
function handleMetricsMessage(data) {
  try {
    const { payload } = data;
    const { metric, value, tag } = payload;
    recordMetric(metric, value, tag.roundid);
  } catch (error) {
    console.error('Error processing metrics callback:', error);
  }
}

/**
 * ===========================================
 * AUDIO VISUALIZATION
 * ===========================================
 */

// Track previous volume levels for smoother transitions
let prevUserVolume = 0;
let prevAiVolume = 0;
const smoothingFactor = 0.3; // Lower = smoother but less responsive

/**
 * Handle audio volume events for volume visualization
 * @param {Object} event - The audio volume event
 */
function handleAudioVolume(event) {
  event.result.forEach(({ userId, volume }) => {
    // Check if this is the local user (empty userId means local microphone)
    const isLocalUser = userId === '';
    
    if (isLocalUser) {
      // Apply smoothing to volume transitions
      const smoothedVolume = (volume * (1 - smoothingFactor)) + (prevUserVolume * smoothingFactor);
      prevUserVolume = smoothedVolume;
      
      // Update the user's volume bar
      updateVolumeBar('userVolumeBar', smoothedVolume);
    } 
    // Check if this is the AI bot
    else if (userId === trtcState.botUserId) {
      // Apply smoothing to volume transitions
      const smoothedVolume = (volume * (1 - smoothingFactor)) + (prevAiVolume * smoothingFactor);
      prevAiVolume = smoothedVolume;
      
      // Update the AI's volume bar
      updateVolumeBar('aiVolumeBar', smoothedVolume);
    }
  });
}

/**
 * Update volume bar element based on volume level
 * @param {string} elementId - The ID of the volume bar element
 * @param {number} volume - The volume level (0-100)
 */
function updateVolumeBar(elementId, volume) {
  const volumeBar = document.getElementById(elementId);
  if (volumeBar) {
    // Scale the volume for better visualization
    // Enhanced scaling to make small volumes more noticeable
    let scaledVolume;
    if (volume < 5) {
      // For very low volumes, maintain minimum width
      scaledVolume = 8;
    } else if (volume < 20) {
      // For low volumes, enhanced scaling
      scaledVolume = 8 + (volume * 1.5);
    } else {
      // For medium to high volumes, standard scaling
      scaledVolume = Math.min(volume * 2.5, 100);
    }
    
    // Use smooth transition for all changes
    volumeBar.style.transition = 'width 0.12s cubic-bezier(0.4, 0, 0.2, 1)';
    volumeBar.style.width = `${scaledVolume}%`;
    
    // Add animation class when volume is above threshold
    if (volume > 5) {
      volumeBar.classList.add('active');
    } else {
      volumeBar.classList.remove('active');
    }
  }
}