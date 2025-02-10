// src/extension.ts
import * as vscode from "vscode";
import { initializeLogger, log } from "./utils/logger";
import { handleWebviewMessage } from "./webview/messageHandler";
import { getWebviewContent } from "./webview/webviewContent";
import { clearApiKey } from "./utils/secretManager";

let panel: vscode.WebviewPanel | undefined;

export function activate(context: vscode.ExtensionContext) {
  initializeLogger();

  log("qBraid Chat extension activated.");

  context.subscriptions.push(
    vscode.commands.registerCommand("qbraid-chat.start", () =>
      createWebview(context)
    ),
    vscode.commands.registerCommand("qbraid-chat.clearApiKey", async () => {
      try {
        await clearApiKey(context);
        vscode.window.showInformationMessage(
          "qBraid API Key cleared successfully."
        );
        log("API Key cleared successfully.");
      } catch (error: any) {
        vscode.window.showErrorMessage(
          `Failed to clear API Key: ${error.message}`
        );
        log(`Failed to clear API Key: ${error.message}`);
      }
    })
  );
}

function createWebview(context: vscode.ExtensionContext) {
  if (panel) {
    panel.reveal();
    log("Existing qBraid Chat panel revealed.");
    return;
  }

  panel = vscode.window.createWebviewPanel(
    "qbraidChat",
    "qBraid Chat",
    vscode.ViewColumn.One,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [context.extensionUri], // Ensure local resources are accessible
    }
  );

  panel.webview.html = getWebviewContent(panel.webview, context.extensionUri); // Pass webview and extension URI

  panel.webview.onDidReceiveMessage(async (msg) => {
    try {
      await handleWebviewMessage(context, panel as vscode.WebviewPanel, msg);
    } catch (error: any) {
      vscode.window.showErrorMessage(
        `Error processing message: ${error.message}`
      );
      log(`Error processing message from webview: ${error.message}`);
      // Optionally, send error back to webview for display
      panel?.webview.postMessage({
        type: "error",
        content: `Error: ${error.message}`,
      });
    }
  });

  panel.onDidDispose(() => {
    panel = undefined;
    log("qBraid Chat panel disposed.");
  });

  log("New qBraid Chat panel created.");
}

export function deactivate() {
  log("qBraid Chat extension deactivated.");
}
