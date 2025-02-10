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

export async function handleWebviewMessage(
  context: vscode.ExtensionContext,
  panel: vscode.WebviewPanel,
  msg: any
) {
  switch (msg.type) {
    case "fetchModels":
      await handleFetchModels(context, panel);
      break;
    case "sendMessage":
      await handleSendMessage(context, panel, msg);
      break;
  }
}

async function handleFetchModels(
  context: vscode.ExtensionContext,
  panel: vscode.WebviewPanel
) {
  // console.log("Starting handleSendMessage...");
  try {
    const apiKey = await getApiKey(context);
    // console.log("API Key:", apiKey);
    if (!apiKey) {
      // console.log("No API Key found.");
      panel.webview.postMessage({
        type: "error",
        content: "API key not found.",
      });
      return;
    }
    const models = await fetchModels(apiKey);
    log(
      `Successfully fetched models: ${models.map((m) => m.model).join(", ")}`
    );
    panel.webview.postMessage({ type: "clearError" });
    panel.webview.postMessage({ type: "models", models });
  } catch (err) {
    log(`Failed to fetch models: ${err}`);
    if (err instanceof Error && err.message.includes("Invalid API key")) {
      const selection = await vscode.window.showErrorMessage(
        "Invalid API Key.",
        "Update API Key"
      );
      if (selection === "Update API Key") {
        const newApiKey = await updateApiKey(context);
        if (newApiKey) {
          try {
            const updatedModels = await fetchModels(newApiKey);
            panel.webview.postMessage({ type: "clearError" });
            panel.webview.postMessage({
              type: "models",
              models: updatedModels,
            });
            vscode.window.showInformationMessage(
              "qBraid API Key updated and models fetched successfully."
            );
          } catch (retryErr) {
            log(`Retry fetch models after API key update failed: ${retryErr}`);
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
      panel.webview.postMessage({ type: "clearError" });
      panel.webview.postMessage({
        type: "error",
        content: `${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }
}

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
  When showing multiple points you can use a table for each point. If anywhere in the response there is _id dont forget to mention it in the response.    `;
    } else if (plan.action === "getModels") {
      const modelsList = (rawApiResponse as ChatModel[])
        .map(
          (model) => `
<strong>${model.model}</strong>
<ul>
  <li>Description: ${model.description}</li>
  <li>Pricing: ${model.pricing.input} input tokens, ${model.pricing.output} output tokens (${model.pricing.units})</li>
</ul>
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
When showing multiple points you can use a table for each point. If anywhere in the response there is _id dont forget to mention it in the response.

      `;
    } else {
      const formattedHtml = formatJsonToHtml(rawApiResponse);

      finalSystem = `
You are a helpful assistant. The user asked: "${userPrompt}".
We performed the action: ${actionDesc || "none"}.
Here is the raw API result:
${formattedHtml}

Each field of JSON should not be printed as it is, it should be explained well. The response should be as natural as possible and make it much readable.Format them as much as possible foe visual appeal. Do NOT show raw JSON. Just produce a user-friendly reply. All new points should start on a new line and sub-sections should be aligned properly.
Please respond in natural language. Do not add characters like ** or anything. 
When showing multiple points you can use a table for each point. If anywhere in the response there is _id dont forget to mention it in the response.

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

// Helper function to escape HTML special characters
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
