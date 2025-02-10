// src/utils/logger.ts
import * as vscode from "vscode";

let debugChannel: vscode.OutputChannel | null = null;

export function initializeLogger() {
  if (!debugChannel) {
    debugChannel = vscode.window.createOutputChannel("qBraid Debug");
  }
}

export function log(message: string) {
  if (debugChannel) {
    debugChannel.appendLine(message);
  }
}
