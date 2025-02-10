import * as vscode from "vscode";
import { initializeLogger, log } from "./utils/logger";
import { handleWebviewMessage } from "./webview/messageHandler";
import { getWebviewContent } from "./webview/webviewContent";
import { clearApiKey } from "./utils/secretManager";

let panel: vscode.WebviewPanel | undefined;

/**
 * Activates the qBraid Chat extension.
 * This function is called when the extension is activated by VS Code.
 *
 * @param {vscode.ExtensionContext} context - The extension context provided by VS Code.
 */
export function activate(context: vscode.ExtensionContext): void {
  // Initialize the logger for debugging
  initializeLogger();

  log("qBraid Chat extension activated.");

  // Register commands for the extension
  context.subscriptions.push(
    vscode.commands.registerCommand("qbraid-chat.start", () =>
      createWebview(context)
    ),
    vscode.commands.registerCommand("qbraid-chat.clearApiKey", async () => {
      try {
        // Clear the stored API key
        await clearApiKey(context);
        vscode.window.showInformationMessage(
          "qBraid API Key cleared successfully."
        );
        log("API Key cleared successfully.");
      } catch (error: any) {
        // Handle errors during API key clearing
        vscode.window.showErrorMessage(
          `Failed to clear API Key: ${error.message}`
        );
        log(`Failed to clear API Key: ${error.message}`);
      }
    })
  );
}

/**
 * Creates a new webview panel for the qBraid Chat interface.
 * If a panel already exists, it will bring it to focus instead of creating a new one.
 *
 * @param {vscode.ExtensionContext} context - The extension context provided by VS Code.
 */
function createWebview(context: vscode.ExtensionContext): void {
  if (panel) {
    // If a panel already exists, reveal it
    panel.reveal();
    log("Existing qBraid Chat panel revealed.");
    return;
  }

  // Create a new webview panel
  panel = vscode.window.createWebviewPanel(
    "qbraidChat", // Internal identifier for the webview
    "qBraid Chat", // Title displayed in the tab
    vscode.ViewColumn.One, // Display in the first column
    {
      enableScripts: true, // Allow scripts to run in the webview
      retainContextWhenHidden: true, // Retain state when hidden
      localResourceRoots: [context.extensionUri], // Restrict access to local resources within the extension folder
    }
  );

  // Set the HTML content of the webview
  panel.webview.html = getWebviewContent(panel.webview, context.extensionUri);

  /**
   * Handle messages received from the webview.
   */
  panel.webview.onDidReceiveMessage(async (msg) => {
    try {
      await handleWebviewMessage(context, panel as vscode.WebviewPanel, msg);
    } catch (error: any) {
      // Display error to the user and log it
      vscode.window.showErrorMessage(
        `Error processing message: ${error.message}`
      );
      log(`Error processing message from webview: ${error.message}`);

      // Optionally send error back to the webview for display
      panel?.webview.postMessage({
        type: "error",
        content: `Error: ${error.message}`,
      });
    }
  });

  /**
   * Handle disposal of the webview panel.
   */
  panel.onDidDispose(() => {
    panel = undefined; // Clear reference to avoid memory leaks
    log("qBraid Chat panel disposed.");
  });

  log("New qBraid Chat panel created.");
}

/**
 * Deactivates the qBraid Chat extension.
 * This function is called when the extension is deactivated by VS Code.
 */
export function deactivate(): void {
  log("qBraid Chat extension deactivated.");
}
