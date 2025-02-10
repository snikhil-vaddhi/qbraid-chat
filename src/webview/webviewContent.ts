import * as vscode from "vscode";

export function getWebviewContent(
  webview: vscode.Webview,
  extensionUri: vscode.Uri
): string {
  const nonce = getNonce();

  const stylesUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, "media", "style.css")
  );

  const scriptUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, "media", "script.js")
  );

  return `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Chat Webview</title>
    <link rel="stylesheet" type="text/css" href="${stylesUri}">
    <style>
      body {
        background-color: var(--vscode-editor-background);
        color: var(--vscode-editor-foreground);
        font-family: var(--vscode-font-family);
        margin: 0;
        padding: 10px;
        height: 100vh;
        display: flex;
        flex-direction: column;
      }
      .chat-container {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      #modelSelector {
        padding: 8px 12px;
        background: var(--vscode-dropdown-background);
        color: var(--vscode-dropdown-foreground);
        border: 1px solid var(--vscode-dropdown-border);
        border-radius: 6px;
        width: 240px;
        font-size: 0.9em;
      }
      #messages {
        flex: 1;
        overflow-y: auto;
        padding: 12px;
        background: var(--vscode-sideBar-background);
        border-radius: 8px;
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .message {
        max-width: 85%;
        padding: 14px 18px;
        border-radius: 14px;
        line-height: 1.5;
        word-break: break-word;
        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
      }
      .user-message {
        background: var(--vscode-button-background);
        color: var(--vscode-button-foreground);
        align-self: flex-end;
        border-bottom-right-radius: 4px;
      }
      .assistant-message {
        background: var(--vscode-input-background);
        color: var(--vscode-input-foreground);
        align-self: flex-start;
        border-bottom-left-radius: 4px;
        border: 1px solid var(--vscode-input-border);
      }
      .error-message {
        background: var(--vscode-inputValidation-errorBackground);
        color: var(--vscode-editorError-foreground);
        border: 1px solid var(--vscode-inputValidation-errorBorder);
        padding: 14px;
        border-radius: 8px;
      }
      .typing {
        display: inline-block;
        width: 50px;
      }
      .typing span {
        display: inline-block;
        width: 8px;
        height: 8px;
        margin-right: 4px;
        background-color: var(--vscode-editor-foreground);
        border-radius: 50%;
        animation: typing 1.4s infinite ease-in-out both;
      }
      .typing span:nth-child(2) { animation-delay: 0.2s; }
      .typing span:nth-child(3) { animation-delay: 0.4s; }

      @keyframes typing {
        0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
        40% { transform: scale(1); opacity: 1; }
      }

      .input-area {
        display: flex;
        gap: 8px;
        padding-top: 12px;
        border-top: 1px solid var(--vscode-sideBarSectionHeader-border);
      }
      #messageInput {
        flex: 1;
        padding: 10px 14px;
        background: var(--vscode-input-background);
        color: var(--vscode-input-foreground);
        border: 1px solid var(--vscode-input-border);
        border-radius: 6px;
        font-family: var(--vscode-font-family);
        font-size: 0.95em;
        transition: border-color 0.2s ease;
      }
      #messageInput:focus {
        outline: none;
        border-color: var(--vscode-focusBorder);
        box-shadow: 0 0 0 2px var(--vscode-focusBorder);
      }
      button {
        padding: 10px 18px;
        background: var(--vscode-button-background);
        color: var(--vscode-button-foreground);
        border: none;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s ease;
        font-weight: 500;
      }
      button:hover {
        background: var(--vscode-button-hoverBackground);
        transform: translateY(-1px);
      }
      button:active {
        transform: translateY(0);
        opacity: 0.9;
      }
      #messages::-webkit-scrollbar {
        width: 10px;
      }
      #messages::-webkit-scrollbar-track {
        background: var(--vscode-scrollbarSlider-background);
        border-radius: 4px;
      }
      #messages::-webkit-scrollbar-thumb {
        background: var(--vscode-scrollbarSlider-activeBackground);
        border-radius: 4px;
        border: 2px solid transparent;
        background-clip: content-box;
      }
        .device-info {
    border: 1px solid var(--vscode-contrastActiveBorder);
    padding: 10px;
    margin-bottom: 10px;
    border-radius: 5px;
    background-color: var(--vscode-list-hoverBackground);
    color: var(--vscode-list-hoverForeground);
}

.device-info h4 {
    margin-top: 0;
    margin-bottom: 5px;
    color: var(--vscode-titleBar-activeForeground);
}

.device-info p {
    margin: 5px 0;
}

.device-info strong {
    color: var(--vscode-textLink-foreground);
}

    </style>
  </head>
  <body>
    <div class="chat-container">
      <select id="modelSelector" aria-label="Select AI model"></select>
      <div id="messages" role="log" aria-live="polite"></div>
      <div class="input-area">
        <input 
          id="messageInput" 
          type="text" 
          placeholder="Type your request..." 
          aria-label="Chat input"
        />
        <button id="sendButton" aria-label="Send message">
          Send
        </button>
      </div>
    </div>
    <script nonce="${nonce}" src="${scriptUri}"></script>
  </body>
</html>
`;
}

function getNonce() {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
