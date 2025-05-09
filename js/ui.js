/**
 * UI module for handling the user interface interactions
 */

// DOM Elements - Cache selectors for performance
const elements = {
  chatList: document.querySelector(".chat-list"),
  startButton: document.getElementById("start-button"),
  endButton: document.getElementById("end-button"),
  textInput: document.getElementById("text-input"),
  sendButton: document.getElementById("send-button"),
  interruptButton: document.getElementById("interrupt-button"),
  muteButton: document.getElementById("mute-button"),
  statusElements: {
    ai: document.getElementById('ai-state'),
    room: document.getElementById('room-status')
  }
};

// Chat messages array
let messages = [];

/**
 * Renders the chat messages in the UI
 */
function renderChatMessages() {
  const fragment = document.createDocumentFragment();

  messages.forEach(message => {
    const messageElement = document.createElement("div");
    messageElement.classList.add("chat-item", message.type);

    const senderElement = document.createElement("div");
    senderElement.classList.add("chat-id");
    senderElement.textContent = message.sender;

    const contentElement = document.createElement("div");
    contentElement.classList.add("chat-text");
    contentElement.textContent = message.content;

    messageElement.appendChild(senderElement);
    messageElement.appendChild(contentElement);
    fragment.appendChild(messageElement);
  });

  elements.chatList.innerHTML = "";
  elements.chatList.appendChild(fragment);
}

/**
 * Updates the status indicators in the UI
 * @param {string} type - The type of status to update ('ai' or 'room')
 * @param {string} statusText - The status text to display
 */
function updateStatus(type, statusText) {
  const element = elements.statusElements[type];
  if (element) {
    element.textContent = statusText;
  } else {
    console.warn(`Status element for type '${type}' not found`);
  }
}

/**
 * Adds a message to the chat
 * @param {string} sender - The sender of the message
 * @param {string} content - The message content
 * @param {string} type - The message type ('user' or 'ai')
 * @param {string} id - The message ID
 * @param {boolean} end - Whether this is the end of the message
 */
function addMessage(sender, content, type, id, end = true) {
  const existingIndex = messages.findIndex(msg => msg.id === id && msg.sender === sender);

  if (existingIndex !== -1) {
    messages[existingIndex].content = content;
    messages[existingIndex].end = end;
  } else {
    messages.unshift({
      id,
      content,
      sender,
      type,
      end
    });
  }

  renderChatMessages();
}

/**
 * Adds a system message to the chat
 * @param {string} content - The message content
 * @param {boolean} isHTML - Whether the content is HTML that should be rendered
 */
function addSystemMessage(content, isHTML = false) {
  const chatItem = document.createElement('div');
  chatItem.className = 'chat-item ai';
  
  const chatId = document.createElement('div');
  chatId.className = 'chat-id';
  chatId.textContent = 'System';
  
  const chatText = document.createElement('div');
  chatText.className = 'chat-text';
  
  if (isHTML) {
    chatText.innerHTML = content;
  } else {
    chatText.textContent = content;
  }
  
  chatItem.appendChild(chatId);
  chatItem.appendChild(chatText);
  elements.chatList.insertBefore(chatItem, elements.chatList.firstChild);
}

/**
 * Reset the UI state
 */
function resetUI() {
  elements.startButton.disabled = false;
  elements.endButton.disabled = true;
  elements.sendButton.disabled = true;
  elements.interruptButton.disabled = true;
  updateStatus('room', "Disconnected");
  updateStatus('ai', "AI NotReady");
} 