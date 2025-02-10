// src/utils/secretManager.ts
import * as vscode from "vscode";
import { log } from "./logger";

const API_KEY_STORAGE_KEY = "qbraid.apiKey";

export async function getApiKey(
  context: vscode.ExtensionContext
): Promise<string | undefined> {
  try {
    const apiKey = await context.secrets.get(API_KEY_STORAGE_KEY);
    if (apiKey) {
      return apiKey;
    }

    const userInput = await vscode.window.showInputBox({
      prompt: "Enter your qBraid API Key",
      ignoreFocusOut: true,
      password: true,
    });

    if (userInput) {
      await context.secrets.store(API_KEY_STORAGE_KEY, userInput);
      log("New API Key stored.");
      return userInput;
    }

    return undefined;
  } catch (error) {
    log(`Secret Manager Error: ${error}`);
    vscode.window.showErrorMessage("Failed to access Secret Storage.");
    return undefined;
  }
}

export async function updateApiKey(
  context: vscode.ExtensionContext
): Promise<string | undefined> {
  const newApiKey = await vscode.window.showInputBox({
    prompt: "Enter your new qBraid API Key",
    ignoreFocusOut: true,
    password: true,
  });

  if (newApiKey) {
    try {
      await context.secrets.store(API_KEY_STORAGE_KEY, newApiKey);
      vscode.window.showInformationMessage("qBraid API Key updated.");
      log("API Key updated.");
      return newApiKey;
    } catch (error) {
      log(`Secret Manager Error: ${error}`);
      vscode.window.showErrorMessage("Failed to store the new API Key.");
    }
  }

  return undefined;
}

export async function clearApiKey(
  context: vscode.ExtensionContext
): Promise<void> {
  try {
    await context.secrets.delete(API_KEY_STORAGE_KEY);
    vscode.window.showInformationMessage("qBraid API Key has been cleared.");
    log("API Key cleared.");
  } catch (error) {
    log(`Secret Manager Error: ${error}`);
    vscode.window.showErrorMessage("Failed to clear qBraid API Key.");
  }
}
