// src/webview/messageHandler.ts
import * as vscode from "vscode";
import { getApiKey, updateApiKey } from "../utils/secretManager";
import {
  fetchModels,
  callLLM,
  createQuantumJob,
  listAllJobs,
  cancelQuantumJob,
  deleteQuantumJob,
  getQuantumDevices,
  sendChat,
} from "../api/qbraidApi";
import { log } from "../utils/logger";
import { ChatModel } from "../api/types";

/**
 * Handles messages received from the webview panel.
 *
 * @param {vscode.ExtensionContext} context - The VS Code extension context.
 * @param {vscode.WebviewPanel} panel - The webview panel to communicate with.
 * @param {any} msg - The message received from the webview.
 */

export async function handleWebviewMessage(
  context: vscode.ExtensionContext,
  panel: vscode.WebviewPanel,
  msg: any
): Promise<void> {
  try {
    switch (msg.type) {
      case "fetchModels":
        await handleFetchModels(context, panel);
        break;
      case "sendMessage":
        await handleSendMessage(context, panel, msg);
        break;
      default:
        log(`Unhandled message type: ${msg.type}`);
        panel.webview.postMessage({
          type: "error",
          content: `Unhandled message type: ${msg.type}`,
        });
    }
  } catch (error) {
    log(`Error handling webview message: ${error}`);
    panel.webview.postMessage({
      type: "error",
      content: `An unexpected error occurred: ${
        error instanceof Error ? error.message : String(error)
      }`,
    });
  }
}

/**
 * Handles API errors and prompts the user to update the API key if necessary.
 *
 * @param {vscode.ExtensionContext} context - The VS Code extension context.
 * @param {vscode.WebviewPanel} panel - The webview panel to communicate with.
 * @param {any} error - The error object.
 * @param {Function} retryCallback - The callback function to execute after updating the API key.
 */
async function handleApiError(
  context: vscode.ExtensionContext,
  panel: vscode.WebviewPanel,
  error: any,
  retryCallback: (newApiKey: string) => Promise<void>
): Promise<void> {
  log(`API Error: ${error}`);
  if (error instanceof Error && error.message.includes("Invalid API key")) {
    const selection = await vscode.window.showErrorMessage(
      "Invalid qBraid API Key. Please update your API key.",
      "Update API Key"
    );
    if (selection === "Update API Key") {
      const newApiKey = await updateApiKey(context);
      if (newApiKey) {
        try {
          await retryCallback(newApiKey);
        } catch (retryErr) {
          log(`Retry operation after API key update failed: ${retryErr}`);
          panel.webview.postMessage({
            type: "error",
            content: `${
              retryErr instanceof Error ? retryErr.message : String(retryErr)
            }`,
          });
        }
      }
    }
  } else {
    panel.webview.postMessage({
      type: "error",
      content: `${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

/**
 * Fetches available chat models and sends them to the webview.
 *
 * @param {vscode.ExtensionContext} context - The VS Code extension context.
 * @param {vscode.WebviewPanel} panel - The webview panel to communicate with.
 */
async function handleFetchModels(
  context: vscode.ExtensionContext,
  panel: vscode.WebviewPanel
): Promise<void> {
  try {
    const apiKey = await getApiKey(context);
    if (!apiKey) {
      panel.webview.postMessage({
        type: "error",
        content: "API key not found. Please configure the qBraid API key.",
      });
      return;
    }

    const models = await fetchModels(apiKey);
    log(
      `Successfully fetched models: ${models.map((m) => m.model).join(", ")}`
    );
    panel.webview.postMessage({ type: "clearError" });
    panel.webview.postMessage({ type: "models", models });
  } catch (error) {
    log(`Failed to fetch models: ${error}`);
    await handleApiError(context, panel, error, async (newApiKey: string) => {
      const updatedModels = await fetchModels(newApiKey);
      panel.webview.postMessage({ type: "clearError" });
      panel.webview.postMessage({
        type: "models",
        models: updatedModels,
      });
      vscode.window.showInformationMessage(
        "qBraid API Key updated and models fetched successfully."
      );
    });
  }
}

/**
 * Handles the "sendMessage" action from the webview.
 * This function processes user input, determines the appropriate action to take (based on LLM-generated plans),
 * calls the relevant qBraid API, formats the response, and sends it back to the webview.
 *
 * @param {vscode.ExtensionContext} context - The VS Code extension context, used to access secrets and other resources.
 * @param {vscode.WebviewPanel} panel - The webview panel used for communication between the extension and the UI.
 * @param {any} msg - The message received from the webview. It contains user input and additional metadata.
 *
 * @throws {Error} - If an unexpected error occurs during execution.
 *
 * @description
 * The function performs the following steps:
 * 1. Retrieves the API key from secret storage. If not found, sends an error message to the webview.
 * 2. Constructs a system prompt and sends it to an LLM (Language Model) to generate a plan of action in JSON format.
 * 3. Parses the LLM's response to determine which qBraid API action to execute (e.g., `createJob`, `listJobs`, etc.).
 * 4. Executes the corresponding API call based on the parsed plan and retrieves the raw response.
 * 5. Formats the raw API response into a user-friendly format using natural language.
 * 6. Sends the formatted response back to the webview for display.
 *
 * If an error occurs during execution:
 * - Logs the error using the `log` function.
 * - If the error is related to an invalid API key, prompts the user to update their API key via a VS Code input box.
 * - Sends an error message back to the webview if any other issue occurs.
 *
 * @example
 * // Example message from webview
 * const msg = {
 *   type: "sendMessage",
 *   content: "List all quantum jobs",
 *   model: "gpt-4o"
 * };
 *
 * // Example usage
 * await handleSendMessage(context, panel, msg);
 */

async function handleSendMessage(
  context: vscode.ExtensionContext,
  panel: vscode.WebviewPanel,
  msg: any
) {
  try {
    const apiKey = await getApiKey(context);
    if (!apiKey) {
      panel.webview.postMessage({
        type: "error",
        content: "API key not found.",
      });
      return;
    }

    const userPrompt = msg.content || "";
    const model = msg.model || "gpt-4o";

    log(`Received user message: ${userPrompt} using model: ${model}`);

    panel.webview.postMessage({ type: "typing" });

    const systemPrompt = `
You are an assistant for qBraid that can instruct a qBraid extension to call certain APIs:
- "createJob": requires "qbraidDeviceId", "shots", and either "bitcode" or "openQasm"
- "listJobs": no parameters needed
- "cancelJob": needs "jobId"
- "deleteJob": needs "jobId"
- "getDevices": can include optional filters like "provider", "type", "status", "isAvailable"
- "sendChat": requires "prompt", optional "model" (default: "gpt-4o-mini"), and "stream" (boolean, default: false)
- "getModels": no parameters needed

If a user asks a general question, respond accordingly.
If a user asks about information or details of any API listed above, explain them accordingly. You might include a few examples as well.
You are an assistant for qBraid that must always respond with valid JSON only.
Your response must be enclosed in triple backticks with the language specifier json.
Do not include any extra text or explanations outside of this format.
Provide exactly ONE JSON block within triple-backticks. Example:

\`\`\`json
{
  "action": "listJobs"
}
\`\`\`

Another example with filters:

\`\`\`json
{
  "action": "getDevices",
  "filters": {
    "provider": "AWS",
    "status": "ONLINE"
  }
}
\`\`\`

Example for sendChat:

\`\`\`json
{
  "action": "sendChat",
  "prompt": "Hello, how are you?",
  "model": "gpt-4o-mini",
  "stream": false
}
\`\`\`

Example for getModels:

\`\`\`json
{
  "action": "getModels"
}
\`\`\`
    `;

    const llmPlanReply = await callLLM(
      apiKey,
      model,
      `${systemPrompt}\nUser: ${userPrompt}`
    );
    log(`LLM planning reply: ${llmPlanReply}`);
    // console.log("llmPlanReply", llmPlanReply);
    // console.log("Raw LLM Reply:", JSON.stringify(llmPlanReply));
    const planMatch = llmPlanReply.match(/```json([\s\S]*?)```/);
    // console.log("planMatch: ", planMatch);
    let plan: any = { action: "none" };
    if (planMatch) {
      let planText = planMatch[1].trim();
      // console.log("planText", planText);
      log(`Parsed action plan from LLM: ${planText}`);
      try {
        plan = JSON.parse(planText);
        // console.log("plan", plan);
      } catch (e) {
        log(`Failed to parse action plan JSON: ${e}`);
      }
    }

    let rawApiResponse: any = null;
    let actionDesc = "";
    // console.log("plan action", plan.action);
    switch (plan.action) {
      case "createJob":
        if (
          !plan.qbraidDeviceId ||
          !plan.shots ||
          (!plan.bitcode && !plan.openQasm)
        ) {
          actionDesc =
            "Invalid createJob request: missing deviceId, shots, or code.";
          break;
        }
        rawApiResponse = await createQuantumJob(
          apiKey,
          plan.qbraidDeviceId,
          plan.shots,
          plan.bitcode,
          plan.openQasm
        );
        actionDesc = "createJob";
        break;
      case "listJobs":
        rawApiResponse = await listAllJobs(apiKey);
        actionDesc = "listJobs";
        break;
      case "cancelJob":
        if (!plan.jobId) {
          actionDesc = "Invalid cancelJob request: missing jobId.";
          break;
        }
        rawApiResponse = await cancelQuantumJob(apiKey, plan.jobId);
        actionDesc = "cancelJob";
        break;
      case "deleteJob":
        if (!plan.jobId) {
          actionDesc = "Invalid deleteJob request: missing jobId.";
          break;
        }
        rawApiResponse = await deleteQuantumJob(apiKey, plan.jobId);
        // console.log("deleteJob", rawApiResponse);
        actionDesc = "deleteJob";
        break;
      case "getDevices":
        // console.log("getting devices");
        rawApiResponse = await getQuantumDevices(apiKey, plan.filters);
        // console.log("rawApiResponse", rawApiResponse);
        actionDesc = "getDevices";
        break;
      case "sendChat":
        if (!plan.prompt) {
          actionDesc = "Invalid sendChat request: missing prompt.";
          break;
        }
        rawApiResponse = await sendChat(
          apiKey,
          plan.prompt,
          plan.model || "gpt-4o-mini",
          plan.stream || false
        );
        actionDesc = "sendChat";
        break;
      case "getModels":
        rawApiResponse = await fetchModels(apiKey);
        actionDesc = "getModels";
        break;
      default:
        log("No recognized action.");
        break;
    }

    if (!rawApiResponse && actionDesc) {
      rawApiResponse = { error: actionDesc };
    }

    let finalSystem: string;
    if (plan.action === "sendChat") {
      finalSystem = `
You are a helpful assistant. The user asked: "${userPrompt}".
We performed the action: ${actionDesc || "none"}.
Here is the raw API result:
${rawApiResponse}

Each field of JSON should not be printed as it is, it should be explained well.
Please respond in natural language. Do not add characters like ** or anything. The response should be as natural as possible and make it much readable.Format them as much as possible foe visual appeal. Do NOT show raw JSON. Just produce a user-friendly reply. All new points should start on a new line and sub-sections should be aligned properly.
If anywhere in the response there is _id dont forget to mention it in the response.    `;
    } else if (plan.action === "getModels") {
      const modelsList = (rawApiResponse as ChatModel[])
        .map(
          (model) => `
<strong>${model.model}</strong>
<ul>
  <li>Description: ${model.description}</li>
  <li>Pricing: ${model.pricing.input} input tokens, ${model.pricing.output} output tokens (${model.pricing.units})</li>
</ul>

for example this way 
- gpt-4o-mini
  - Description: A lightweight version of GPT-4.
  - Pricing: $0.01 per 1,000 input tokens, $0.02 per 1,000 output tokens

- gpt-4o
  - Description: The full version of GPT-4.
  - Pricing: $0.03 per 1,000 input tokens, $0.06 per 1,000 output tokens
      `
        )
        .join("");

      finalSystem = `
You are a helpful assistant. The user asked: "${userPrompt}".
We performed the action: ${actionDesc || "none"}.
Here is the raw API result:
${modelsList}... Each field of JSON should not be printed as it is, it should be explained well.
The response should be as natural as possible and make it much readable.Format them as much as possible foe visual appeal. Do NOT show raw JSON. Just produce a user-friendly reply. All new points should start on a new line and sub-sections should be aligned properly.
Please respond in natural language. Do not add characters like ** or anything. 
If anywhere in the response there is _id dont forget to mention it in the response.

      `;
    } else {
      const formattedHtml = formatJsonToHtml(rawApiResponse);

      finalSystem = `
You are a helpful assistant. The user asked: "${userPrompt}".
We performed the action: ${actionDesc || "none"}.
Here is the raw API result:
${formattedHtml}

Please provide information about devices or systems in the following format.
 Each device/system should be grouped together with its details clearly explained and 
 formatted for readability. Avoid including unnecessary information like links or logos. 
 Use natural language and avoid special characters like ** or -. 
 Provide only 3-4 key pieces of information, such as ID, provider, status, and execution 
 time. If there is an _id field in the data, make sure to include it in the response. 
 Start each new device/system on a new line and align sub-sections properly. 
 Ensure descriptions are concise and limited to 1-2 lines. 
 Each device should be in its own box or table. Format as follows:
[Device/System Name] |
ID: [Unique Identifier] |
Provider: [Name of Provider]|
Status: [Online/Offline/Other Status]|
Qubits: [Number of Qubits, if applicable]|
Pending Jobs: [Number of Pending Jobs]|
Execution Time: [Approximate Time Required for Execution]|
Description: [Brief explanation in 1-2 lines]|
After on device is done the rest of the remining space should be filled with dashes (--).
Ensure all details of the same device/system are grouped together.
      `;
    }

    const finalAnswer = await callLLM(apiKey, model, finalSystem);
    log(`Final answer from LLM: ${finalAnswer}`);

    panel.webview.postMessage({
      type: "clearError",
    });
    panel.webview.postMessage({
      type: "answer",
      content: finalAnswer,
    });
  } catch (error) {
    log(`Error handling send message: ${error}`);
    if (error instanceof Error && error.message.includes("Invalid API key")) {
      const selection = await vscode.window.showErrorMessage(
        "Invalid qBraid API Key. Please update your API key.",
        "Update API Key"
      );
      if (selection === "Update API Key") {
        const newApiKey = await updateApiKey(context);
        if (newApiKey) {
          vscode.window.showInformationMessage(
            "qBraid API Key updated. Please retry your request."
          );
        }
      }
    } else {
      panel.webview.postMessage({
        type: "clearError",
      });
      panel.webview.postMessage({
        type: "error",
        content: `${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }
}

/**
 * Formats a JSON object into an HTML unordered list.
 *
 * @param {any} obj - The JSON object to format.
 * @param {number} indent - The current indentation level.
 * @returns {string} - The HTML representation of the JSON object.
 */
function formatJsonToHtml(obj: any, indent = 0): string {
  if (typeof obj === "object" && obj !== null) {
    let html = "<ul>";
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];
        html += `<li><strong>${escapeHtml(key)}:</strong> `;
        if (typeof value === "object" && value !== null) {
          html += formatJsonToHtml(value, indent + 1); // Recursive call for nested objects
        } else {
          html += `${escapeHtml(value)}`;
        }
        html += `</li>`;
      }
    }
    html += "</ul>";
    return html;
  } else {
    return escapeHtml(obj);
  }
}

/**
 * Escapes HTML special characters in a string.
 *
 * @param {any} value - The value to escape.
 * @returns {string} - The escaped string.
 */
function escapeHtml(value: any): string {
  if (typeof value !== "string") {
    return value;
  }
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
