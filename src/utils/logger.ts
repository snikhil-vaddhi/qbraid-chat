import * as vscode from "vscode";

/**
 * A reference to the VS Code output channel used for logging debug messages.
 * Initialized only once to avoid creating multiple instances.
 */
let debugChannel: vscode.OutputChannel | null = null;

/**
 * Initializes the logger by creating a VS Code output channel named "qBraid Debug".
 * This function ensures that the output channel is created only once during the session.
 */
export function initializeLogger(): void {
  if (!debugChannel) {
    debugChannel = vscode.window.createOutputChannel("qBraid Debug");
  }
}

/**
 * Logs a message to the "qBraid Debug" output channel.
 * If the logger has not been initialized, this function will silently do nothing.
 *
 * @param {string} message - The message to log to the output channel.
 */
export function log(message: string): void {
  if (debugChannel) {
    debugChannel.appendLine(message);
  } else {
    console.warn(
      "Logger not initialized. Call initializeLogger() before logging."
    );
  }
}
