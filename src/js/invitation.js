/**
 * Invitation Management Module
 * Handles all functionality related to creating, displaying, and managing invitation links
 */

// State for invitation functionality
const invitationState = {
  currentUrl: null,
  isMinimized: false,
  panelCreated: false
};

/**
 * Generate an invitation URL for joining a group chat
 * @param {string|number} roomId - The room ID
 * @param {string|number} sdkAppId - The SDK App ID
 * @param {string} agentId - The agent ID
 * @param {string} taskId - The conversation task ID
 * @param {boolean} useShortFormat - Whether to use short format parameters
 * @returns {string} The invitation URL
 */
function generateInviteUrl(roomId, sdkAppId, agentId, taskId = '', useShortFormat = false) {
  const baseUrl = window.location.origin;
  const url = new URL(baseUrl);
  
  if (useShortFormat) {
    // Create short format URL
    url.searchParams.append('j', '1');
    url.searchParams.append('r', roomId);
    url.searchParams.append('s', sdkAppId);
    url.searchParams.append('a', agentId);
    if (taskId) {
      url.searchParams.append('t', taskId);
    }
  } else {
    // Create standard format URL
    url.searchParams.append('join', 'true');
    url.searchParams.append('roomId', roomId);
    url.searchParams.append('sdkAppId', sdkAppId);
    url.searchParams.append('agent', agentId);
    if (taskId) {
      url.searchParams.append('taskId', taskId);
    }
  }
  
  invitationState.currentUrl = url.toString();
  return invitationState.currentUrl;
}

/**
 * Creates or updates a persistent invitation panel in the UI
 * @param {string} inviteUrl - The invitation URL to display
 * @param {Object} options - Optional configuration settings
 */
function createInvitationPanel(inviteUrl, options = {}) {
  // Store URL in state
  invitationState.currentUrl = inviteUrl;
  
  // Check if panel already exists
  let invitePanel = document.getElementById('invitation-panel');
  if (invitePanel) {
    // Update existing panel
    const urlInput = invitePanel.querySelector('.invite-url-input');
    if (urlInput) urlInput.value = inviteUrl;
    
    // Update QR code with delay to ensure DOM is ready
    setTimeout(() => updateQRCode(inviteUrl), 100);
    
    invitePanel.style.display = 'block';
    
    // Add animation class
    invitePanel.classList.add('panel-fade-in');
    setTimeout(() => invitePanel.classList.remove('panel-fade-in'), 500);
    
    return;
  }
  
  // Create new invitation panel
  invitePanel = document.createElement('div');
  invitePanel.id = 'invitation-panel';
  invitePanel.className = 'invitation-panel panel-fade-in';
  invitePanel.innerHTML = `
    <div class="invitation-header">
      <h3>聊天室邀请</h3>
      <button onclick="Invitation.hide()" class="close-btn" aria-label="关闭">×</button>
    </div>
    <div class="invitation-content">
      <div id="qrcode-container" class="qrcode-container"></div>
      <div class="invite-url-container">
        <input type="text" readonly value="${inviteUrl}" id="inviteUrlInput" class="invite-url-input" />
        <button onclick="Invitation.copyUrl()" class="copy-btn">复制</button>
      </div>
      <div class="invite-footer">
        <span class="invite-tip">扫描二维码邀请好友加入聊天</span>
      </div>
    </div>
  `;
  
  // Add panel to the DOM
  document.body.appendChild(invitePanel);
  invitationState.panelCreated = true;
  
  // Remove animation class after animation completes
  setTimeout(() => invitePanel.classList.remove('panel-fade-in'), 500);
  
  // Generate QR code with delay to ensure DOM is ready
  setTimeout(() => {
    generateQRCode(inviteUrl);
  }, 200);
}

/**
 * Generate a QR code for the given URL
 * @param {string} url - The URL to encode in the QR code
 */
function generateQRCode(url) {
  if (!url) return;
  
  const qrContainer = document.getElementById('qrcode-container');
  if (!qrContainer) return;
  
  // Clear existing QR code
  qrContainer.innerHTML = '';
  
  // Create a new QR code
  if (typeof QRCode !== 'undefined') {
    try {
      // Check if URL is too long for QR code
      if (url.length > 500) {
        // Create simplified URL for QR code
        const simplifiedUrl = simplifyUrl(url);
        
        // Create QR code instance with simplified URL
        const qrcode = new QRCode(qrContainer, {
          text: simplifiedUrl,
          width: 160,
          height: 160,
          colorDark: "#4B85C3",
          colorLight: "#ffffff",
          correctLevel: QRCode.CorrectLevel.M // Lower error correction for longer URLs
        });
        
        // Add note about simplified URL
        const noteElem = document.createElement('div');
        noteElem.className = 'qrcode-note';
        noteElem.textContent = '* 二维码使用简化链接';
        qrContainer.appendChild(noteElem);
      } else {
        // Normal URL, create standard QR code
        const qrcode = new QRCode(qrContainer, {
          text: url,
          width: 160,
          height: 160,
          colorDark: "#4B85C3",
          colorLight: "#ffffff",
          correctLevel: QRCode.CorrectLevel.H
        });
      }
      
      // Add a class to the container for styling
      qrContainer.classList.add('qrcode-ready');
    } catch (e) {
      console.error('Failed to generate QR code:', e);
      
      // Fallback: create a text link
      qrContainer.innerHTML = `
        <div class="qrcode-fallback">
          <p>链接过长，请直接复制分享</p>
        </div>
      `;
    }
  } else {
    // QR code library not available
    qrContainer.innerHTML = `
      <div class="qrcode-fallback">
        <p>二维码生成器未加载</p>
      </div>
    `;
  }
}

/**
 * Simplify a URL for QR code generation
 * @param {string} url - The URL to simplify
 * @returns {string} A simplified version of the URL
 */
function simplifyUrl(url) {
  try {
    // Parse the URL
    const urlObj = new URL(url);
    
    // Get essential parameters
    const baseUrl = urlObj.origin;
    const roomId = urlObj.searchParams.get('roomId');
    const sdkAppId = urlObj.searchParams.get('sdkAppId');
    const agent = urlObj.searchParams.get('agent');
    
    // Create a simplified URL with only essential parameters
    const simplifiedUrl = `${baseUrl}/?j=1&r=${roomId}&s=${sdkAppId}&a=${agent}`;
    
    return simplifiedUrl;
  } catch (e) {
    console.error('Error simplifying URL:', e);
    return url;
  }
}

/**
 * Update the QR code with a new URL
 * @param {string} url - The new URL for the QR code
 */
function updateQRCode(url) {
  // Always regenerate the QR code instead of trying to update it
  generateQRCode(url);
}

/**
 * Copy the invitation URL to clipboard
 */
function copyInviteUrl() {
  const inviteUrlInput = document.getElementById('inviteUrlInput');
  if (!inviteUrlInput) return;
  
  // Select the text
  inviteUrlInput.select();
  inviteUrlInput.setSelectionRange(0, 99999); // For mobile devices
  
  // Copy to clipboard
  navigator.clipboard.writeText(inviteUrlInput.value)
    .then(() => {
      // Show success message
      const copyBtn = document.querySelector('.copy-btn');
      const originalText = copyBtn.textContent;
      copyBtn.textContent = '已复制!';
      copyBtn.classList.add('copied');
      
      // Reset button text after 2 seconds
      setTimeout(() => {
        copyBtn.textContent = originalText;
        copyBtn.classList.remove('copied');
      }, 2000);
    })
    .catch(err => {
      console.error('Failed to copy: ', err);
      alert('复制失败，请手动复制链接');
    });
}

/**
 * Toggle the visibility of the invitation panel
 */
function toggleInvitePanel() {
  const panel = document.getElementById('invitation-panel');
  if (!panel) return;
  
  if (panel.style.display === 'none') {
    panel.style.display = 'block';
    panel.classList.add('panel-fade-in');
    setTimeout(() => panel.classList.remove('panel-fade-in'), 500);
  } else {
    hideInvitationPanel();
  }
}

/**
 * Hide the invitation panel
 */
function hideInvitationPanel() {
  const panel = document.getElementById('invitation-panel');
  if (panel) {
    panel.style.display = 'none';
  }
}

/**
 * Show the invitation panel if it exists
 */
function showInvitationPanel() {
  const panel = document.getElementById('invitation-panel');
  if (panel) {
    panel.style.display = 'block';
  }
}

/**
 * Update the invitation URL with a new taskId
 * @param {string} taskId - The new task ID
 */
function updateInviteUrlWithTaskId(taskId) {
  if (!invitationState.currentUrl || !taskId) return;
  
  const url = new URL(invitationState.currentUrl);
  
  // Check if using short format
  if (url.searchParams.has('j')) {
    url.searchParams.set('t', taskId);
  } else {
    url.searchParams.set('taskId', taskId);
  }
  
  invitationState.currentUrl = url.toString();
  
  // Update URL in input field
  const urlInput = document.getElementById('inviteUrlInput');
  if (urlInput) {
    urlInput.value = invitationState.currentUrl;
  }
  
  // Update QR code if possible
  updateQRCode(invitationState.currentUrl);
  
  return invitationState.currentUrl;
}

/**
 * Check if the current agent supports invitations
 * @param {string} agentId - The agent ID to check
 * @returns {Promise<boolean>} Whether the agent supports invitations
 */
async function isInvitationSupported(agentId) {
  try {
    const response = await fetch(`/agents/${agentId}`);
    const agentInfo = await response.json();
    
    // Check if the agent has experimental params indicating it's a group chat
    return !!(agentInfo.isGroupChat || 
              (agentInfo.ExperimentalParams && agentInfo.ExperimentalParams.isGroupChat) ||
              agentId === 'daji' || 
              agentId === 'group_chat');
  } catch (error) {
    console.error('Error checking invitation support:', error);
    return false;
  }
}

/**
 * Process URL parameters for invitation links
 * @returns {Object|null} Invitation parameters if present, null otherwise
 */
function processInvitationParams() {
  const urlParams = new URLSearchParams(window.location.search);
  
  // Check for standard parameters
  if (urlParams.has('join') && urlParams.has('roomId') && urlParams.has('sdkAppId') && urlParams.has('agent')) {
    return {
      roomId: urlParams.get('roomId'),
      sdkAppId: urlParams.get('sdkAppId'),
      agentId: urlParams.get('agent'),
      taskId: urlParams.get('taskId')
    };
  }
  
  // Check for simplified parameters (j=1&r=roomId&s=sdkAppId&a=agent)
  if (urlParams.has('j') && urlParams.has('r') && urlParams.has('s') && urlParams.has('a')) {
    return {
      roomId: urlParams.get('r'),
      sdkAppId: urlParams.get('s'),
      agentId: urlParams.get('a'),
      taskId: urlParams.get('t') // Optional taskId
    };
  }
  
  return null;
}

/**
 * Clear URL parameters after processing
 */
function clearUrlParameters() {
  window.history.replaceState({}, document.title, window.location.pathname);
}

/**
 * Share the invitation URL using the Web Share API
 */
function shareInviteUrl() {
  if (!navigator.share || !invitationState.currentUrl) return;
  
  navigator.share({
    title: '聊天室邀请',
    text: '加入我的AI聊天室',
    url: invitationState.currentUrl
  })
  .then(() => console.log('Successful share'))
  .catch(error => console.log('Error sharing:', error));
}

// Export functions as a global Invitation object
window.Invitation = {
  generate: generateInviteUrl,
  createPanel: createInvitationPanel,
  togglePanel: toggleInvitePanel,
  copyUrl: copyInviteUrl,
  shareUrl: shareInviteUrl,
  hide: hideInvitationPanel,
  show: showInvitationPanel,
  updateTaskId: updateInviteUrlWithTaskId,
  isSupported: isInvitationSupported,
  processParams: processInvitationParams,
  clearParams: clearUrlParameters
}; 