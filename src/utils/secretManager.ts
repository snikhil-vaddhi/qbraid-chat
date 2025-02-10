import * as vscode from "vscode";
import { log } from "./logger";

/** The storage key used to save the qBraid API Key in the VS Code secret storage. */
const API_KEY_STORAGE_KEY = "qbraid.apiKey";

/**
 * Retrieves the qBraid API Key from the VS Code secret storage.
 * If no API Key is found, prompts the user to enter one and stores it securely.
 *
 * @param {vscode.ExtensionContext} context - The VS Code extension context for accessing secret storage.
 * @returns {Promise<string | undefined>} - The stored or newly entered API Key, or `undefined` if the user cancels.
 */
export async function getApiKey(
  context: vscode.ExtensionContext
): Promise<string | undefined> {
  try {
    // Attempt to retrieve the API Key from secret storage
    const apiKey = await context.secrets.get(API_KEY_STORAGE_KEY);
    if (apiKey) {
      return apiKey;
    }

    // Prompt the user to enter an API Key if none is found
    const userInput = await vscode.window.showInputBox({
      prompt: "Enter your qBraid API Key",
      ignoreFocusOut: true,
      password: true,
    });

    if (userInput) {
      // Store the newly entered API Key in secret storage
      await context.secrets.store(API_KEY_STORAGE_KEY, userInput);
      log("New API Key stored.");
      return userInput;
    }

    // Return undefined if the user cancels the input
    return undefined;
  } catch (error) {
    // Log and display an error message if something goes wrong
    log(`Secret Manager Error: ${error}`);
    vscode.window.showErrorMessage("Failed to access Secret Storage.");
    return undefined;
  }
}

/**
 * Updates the qBraid API Key by prompting the user for a new key and storing it securely.
 *
 * @param {vscode.ExtensionContext} context - The VS Code extension context for accessing secret storage.
 * @returns {Promise<string | undefined>} - The newly updated API Key, or `undefined` if the user cancels.
 */
export async function updateApiKey(
  context: vscode.ExtensionContext
): Promise<string | undefined> {
  try {
    // Prompt the user to enter a new API Key
    const newApiKey = await vscode.window.showInputBox({
      prompt: "Enter your new qBraid API Key",
      ignoreFocusOut: true,
      password: true,
    });

    if (newApiKey) {
      // Store the new API Key in secret storage
      await context.secrets.store(API_KEY_STORAGE_KEY, newApiKey);
      vscode.window.showInformationMessage("qBraid API Key updated.");
      log("API Key updated.");
      return newApiKey;
    }

    // Return undefined if the user cancels the input
    return undefined;
  } catch (error) {
    // Log and display an error message if something goes wrong
    log(`Secret Manager Error: ${error}`);
    vscode.window.showErrorMessage("Failed to store the new API Key.");
    return undefined;
  }
}

/**
 * Clears (deletes) the stored qBraid API Key from VS Code secret storage.
 *
 * @param {vscode.ExtensionContext} context - The VS Code extension context for accessing secret storage.
 * @returns {Promise<void>} - Resolves when the API Key has been successfully cleared.
 */
export async function clearApiKey(
  context: vscode.ExtensionContext
): Promise<void> {
  try {
    // Delete the stored API Key from secret storage
    await context.secrets.delete(API_KEY_STORAGE_KEY);
    vscode.window.showInformationMessage("qBraid API Key has been cleared.");
    log("API Key cleared.");
  } catch (error) {
    // Log and display an error message if something goes wrong
    log(`Secret Manager Error: ${error}`);
    vscode.window.showErrorMessage("Failed to clear qBraid API Key.");
  }
}
