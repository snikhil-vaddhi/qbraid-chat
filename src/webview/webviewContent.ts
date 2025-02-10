import * as vscode from "vscode";

/**
 * Generates the HTML content for a VS Code webview.
 *
 * @param {vscode.Webview} webview - The webview instance to generate content for.
 * @param {vscode.Uri} extensionUri - The URI of the extension directory.
 * @returns {string} - The complete HTML content as a string.
 */
export function getWebviewContent(
  webview: vscode.Webview,
  extensionUri: vscode.Uri
): string {
  // Generate a unique nonce to secure the webview's script execution
  const nonce = getNonce();

  // Resolve the URIs for the external CSS and JavaScript files
  const stylesUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, "media", "style.css")
  );

  const scriptUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, "media", "script.js")
  );

  // Return the HTML content for the webview
  return `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Chat Webview</title>
    <link rel="stylesheet" type="text/css" href="${stylesUri}">
    <style>
      /* Inline styles for basic layout and theming */
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
      }
      .user-message {
        background: var(--vscode-button-background);
        color: var(--vscode-button-foreground);
        align-self: flex-end;
      }
      .assistant-message {
        background: var(--vscode-input-background);
        color: var(--vscode-input-foreground);
        align-self: flex-start;
      }
      .error-message {
        background-color: var(--vscode-inputValidation-errorBackground);
        color: var(--vscode-editorError-foreground);
      }
      .input-area {
        display: flex;
        gap: 8px;
      }
      #messageInput {
        flex-grow: 1;
      }
    </style>
  </head>
  
  <body>
    <div class="chat-container">
      <!-- Dropdown for selecting models -->
      <select id="modelSelector" aria-label="Select AI model"></select>

      <!-- Messages container -->
      <div id="messages" role="log" aria-live="polite"></div>

      <!-- Input area -->
      <div class="input-area">
        <input 
          id="messageInput" 
          type="text" 
          placeholder="Type your request..." 
          aria-label="Chat input"
          autocomplete="off"
          spellcheck="false"
          />
        
        <button id="sendButton" aria-label="Send message">Send</button>
      </div>
    </div>

    <!-- Link to external JavaScript file -->
    <script nonce="${nonce}" src="${scriptUri}"></script>
  </body>
</html>
`;
}

/**
 * Generates a unique nonce (number used once) for securing webview scripts.
 *
 * @returns {string} - A randomly generated nonce string.
 */
function getNonce(): string {
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  return Array.from({ length: 32 }, () =>
    possible.charAt(Math.floor(Math.random() * possible.length))
  ).join("");
}
