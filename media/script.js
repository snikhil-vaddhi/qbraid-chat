// media/script.js

// Acquire the VS Code API
const vscode = acquireVsCodeApi();

// DOM Elements
const messagesDiv = document.getElementById("messages");
const modelSelector = document.getElementById("modelSelector");
const messageInput = document.getElementById("messageInput");
const sendButton = document.querySelector("button");

// Initialize the webview by requesting available models
vscode.postMessage({ type: "fetchModels" });

// Event listener for receiving messages from the extension
window.addEventListener("message", (event) => {
  const msg = event.data;

  switch (msg.type) {
    case "models":
      modelSelector.innerHTML = msg.models
        .map((m) => `<option value="${m.model}">${m.model}</option>`)
        .join("");
      break;
    case "typing":
      appendTypingIndicator();
      break;
    case "answer":
      replaceTypingWithAnswer(msg.content);
      break;
    case "error":
      replaceTypingWithError(msg.content);
      break;
    default:
      console.error(`Unknown message type: ${msg.type}`);
  }
});

// Message functions
function appendMessage(content, role) {
  const div = document.createElement("div");
  div.className = `message ${role}-message`;
  div.innerHTML =
    role === "assistant"
      ? content
      : document.createTextNode(content).textContent;
  messagesDiv.appendChild(div);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function appendTypingIndicator() {
  if (document.querySelector(".typing-message")) {
    return;
  }

  const div = document.createElement("div");
  div.className = "message assistant-message typing-message";
  div.innerHTML =
    '<div class="typing"><span></span><span></span><span></span></div>';
  messagesDiv.appendChild(div);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function replaceTypingWithAnswer(content) {
  const typingDiv = document.querySelector(".typing-message");
  if (typingDiv) {
    typingDiv.outerHTML = `
      <div class="message assistant-message">
        ${content}
      </div>
    `;
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  } else {
    appendMessage(content, "assistant");
  }
}

function replaceTypingWithError(content) {
  const typingDiv = document.querySelector(".typing-message");
  if (typingDiv) {
    typingDiv.remove();
  }

  const div = document.createElement("div");
  div.className = "error-message";
  div.textContent = content;
  messagesDiv.appendChild(div);
}

// Event handlers
function sendMessage() {
  const text = messageInput.value.trim();
  if (!text) {
    return;
  }

  appendMessage(text, "user");
  vscode.postMessage({
    type: "sendMessage",
    content: text,
    model: modelSelector.value,
  });
  messageInput.value = "";
  messageInput.focus();
}

messageInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

sendButton.addEventListener("click", sendMessage);
