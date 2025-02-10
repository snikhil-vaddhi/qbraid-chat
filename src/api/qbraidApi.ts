import fetch from "node-fetch";
import {
  QuantumJob,
  QuantumDevice,
  ChatModel,
  ResData,
  DeleteJobResponse,
} from "./types";
import { log } from "../utils/logger";
import {
  QBRAID_API_BASE_URL,
  CHAT_MODELS_ENDPOINT,
  CHAT_ENDPOINT,
  QUANTUM_JOBS_ENDPOINT,
  QUANTUM_DEVICES_ENDPOINT,
} from "../constants";

/**
 * Calls the language model (LLM) with the given API key, model, and prompt.
 *
 * @param {string} apiKey - The API key for authentication.
 * @param {string} model - The name of the language model to use.
 * @param {string} prompt - The prompt to send to the language model.
 * @returns {Promise<string>} - A promise that resolves with the LLM's reply.
 * @throws {Error} - If the API key is invalid or the API call fails.
 */

export async function callLLM(
  apiKey: string,
  model: string,
  prompt: string
): Promise<string> {
  log(`LLM Call - Model: ${model}, Prompt: ${prompt}`);

  const resp = await fetch(CHAT_ENDPOINT, {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      prompt,
      stream: false,
    }),
  });

  if (resp.status === 401) {
    throw new Error("Invalid API key. Please update your qBraid API key.");
  }
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(
      `callLLM failed: ${resp.status} ${resp.statusText} - ${txt}`
    );
  }

  const data = await resp.json();
  if (typeof data === "object" && data !== null && "content" in data) {
    const reply = (data as { content: string }).content || "";
    log(`LLM Reply: ${reply}`);
    return reply;
  } else {
    throw new Error("Invalid response format");
  }
}

/**
 * Creates a quantum job with the given API key, device ID, shots, and either bitcode or openQasm.
 *
 * @param {string} apiKey - The API key for authentication.
 * @param {string} deviceId - The ID of the quantum device to use.
 * @param {number} shots - The number of shots to run the job for.
 * @param {string} [bitcode] - The bitcode for the quantum circuit (optional).
 * @param {string} [openQasm] - The OpenQASM code for the quantum circuit (optional).
 * @returns {Promise<QuantumJob>} - A promise that resolves with the created quantum job.
 * @throws {Error} - If neither bitcode nor openQasm is provided, or if both are provided, or if the API call fails.
 */

export async function createQuantumJob(
  apiKey: string,
  deviceId: string,
  shots: number,
  bitcode?: string,
  openQasm?: string
): Promise<QuantumJob> {
  if ((!bitcode && !openQasm) || (bitcode && openQasm)) {
    throw new Error(
      "Provide either bitcode OR openQasm (but not both) for createJob."
    );
  }

  const body: any = {
    qbraidDeviceId: deviceId,
    shots,
    tags: {},
  };
  // console.log("body", body);
  if (bitcode) {
    body.bitcode = bitcode;
    const bitcodeMatch = bitcode.match(/qubit\[(\d+)\]/);
    body.circuitNumQubits = bitcodeMatch ? parseInt(bitcodeMatch[1]) : 1;
  } else if (openQasm) {
    body.openQasm = openQasm;
    const openQasmMatch = openQasm.match(/qubit\[(\d+)\]/);
    body.circuitNumQubits = openQasmMatch ? parseInt(openQasmMatch[1]) : 1;
  }

  const response = await fetch(QUANTUM_JOBS_ENDPOINT, {
    method: "POST",
    headers: { "api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (response.status === 401) {
    throw new Error("Invalid API key. Please update your qBraid API key.");
  }
  if (!response.ok) {
    const errTxt = await response.text();
    throw new Error(`Create job failed: ${response.status} - ${errTxt}`);
  }

  const resData = await response.json();
  if (typeof resData === "object" && resData !== null) {
    log(`Create Job Response: ${JSON.stringify(resData)}`);
    return resData as QuantumJob;
  } else {
    throw new Error("Invalid response format");
  }
}

/**
 * Lists all quantum jobs for the given API key.
 *
 * @param {string} apiKey - The API key for authentication.
 * @returns {Promise<QuantumJob[]>} - A promise that resolves with an array of quantum jobs.
 * @throws {Error} - If the API key is invalid or the API call fails.
 */

export async function listAllJobs(apiKey: string): Promise<QuantumJob[]> {
  const response = await fetch(QUANTUM_JOBS_ENDPOINT, {
    method: "GET",
    headers: { "api-key": apiKey },
  });
  // console.log("respnonse: ", response);
  if (response.status === 401) {
    throw new Error("Invalid API key. Please update your qBraid API key.");
  }
  if (!response.ok) {
    const errTxt: string = await response.text();
    throw new Error(`List jobs failed: ${response.status} - ${errTxt}`);
  }

  const resData = (await response.json()) as ResData;
  // console.log("resData", resData);

  if (
    Array.isArray(resData.jobsArray) &&
    resData.jobsArray.every(isQuantumJob)
  ) {
    return resData.jobsArray as QuantumJob[];
  } else {
    throw new Error("Invalid response format");
  }
}

/**
 * Type guard to check if the provided data is a valid QuantumJob.
 *
 * @param {unknown} data - The data to check.
 * @returns {boolean} - True if the data is a QuantumJob, false otherwise.
 */

function isQuantumJob(data: unknown): data is QuantumJob {
  return (
    typeof data === "object" &&
    data !== null &&
    "_id" in data && // Check for _id instead of id
    "qbraidJobId" in data && // Check for qbraidJobId instead of name
    "status" in data && // Ensure status exists
    "provider" in data // Check for provider as an additional validation
  );
}

/**
 * Cancels a quantum job with the given API key and job ID.
 *
 * @param {string} apiKey - The API key for authentication.
 * @param {string} jobId - The ID of the quantum job to cancel.
 * @returns {Promise<{ message: string }>} - A promise that resolves with a message indicating the cancellation status.
 * @throws {Error} - If the API key is invalid or the API call fails.
 */

export async function cancelQuantumJob(
  apiKey: string,
  jobId: string
): Promise<{ message: string }> {
  // console.log("jobId", jobId);
  // const url = `${QUANTUM_JOBS_ENDPOINT}/cancel/${jobId}`;
  // console.log("url", url);
  const response = await fetch(`${QUANTUM_JOBS_ENDPOINT}/cancel/${jobId}`, {
    method: "PUT",
    headers: { "api-key": apiKey },
  });
  // const response = {
  //   status: 401, // Simulate HTTP status code
  //   ok: true, // Simulate `response.ok` for successful requests
  //   json: async () => ({
  //     message: "Cancel job request validated", // Mocked response body
  //   }),
  //   text: async () => "Error message", // Mocked error text (if needed)
  // };

  // console.log("response", response);

  if (response.status === 401) {
    throw new Error("Invalid API key. Please update your qBraid API key.");
  }
  if (!response.ok) {
    const errTxt: string = await response.text();
    throw new Error(`Cancel job failed: ${response.status} - ${errTxt}`);
  }

  const resData = await response.json();
  // console.log("resData", resData);
  if (isMessageResponse(resData)) {
    return { message: resData.message };
  } else {
    throw new Error("Invalid response format");
  }
}

/**
 * Type guard to check if the provided data is a valid message response.
 *
 * @param {unknown} data - The data to check.
 * @returns {boolean} - True if the data is a message response, false otherwise.
 */

function isMessageResponse(data: unknown): data is { message: string } {
  return (
    typeof data === "object" &&
    data !== null &&
    "message" in data &&
    typeof (data as any).message === "string"
  );
}

/**
 * Deletes a quantum job with the given API key and job ID.
 *
 * @param {string} apiKey - The API key for authentication.
 * @param {string} jobId - The ID of the quantum job to delete.
 * @returns {Promise<DeleteJobResponse>} - A promise that resolves with the deleted quantum job and a success message.
 * @throws {Error} - If the API key is invalid or the API call fails.
 */

export async function deleteQuantumJob(
  apiKey: string,
  jobId: string
): Promise<DeleteJobResponse> {
  const response = await fetch(`${QUANTUM_JOBS_ENDPOINT}/${jobId}`, {
    method: "DELETE",
    headers: { "api-key": apiKey },
  });

  if (response.status === 401) {
    throw new Error("Invalid API key. Please update your qBraid API key.");
  }

  if (!response.ok) {
    const errTxt: string = await response.text();
    throw new Error(`Delete job failed: ${response.status} - ${errTxt}`);
  }

  const resData = await response.json();
  // console.log("resData", resData);

  if (
    resData &&
    typeof resData === "object" &&
    "data" in resData &&
    "message" in resData
  ) {
    const jobData = (resData as any).data;
    const message = (resData as any).message;

    if (isQuantumJob(jobData)) {
      return {
        message,
        job: jobData,
      };
    } else {
      throw new Error("Invalid job data format");
    }
  } else {
    throw new Error("Invalid response format");
  }
}

/**
 * Retrieves a list of quantum devices based on the provided filters.
 *
 * @param {string} apiKey - The API key for authentication.
 * @param {Record<string, string>} [filters] - An optional object containing filters to apply to the device list.
 *                                             Allowed filters: "provider", "type", "status", "isAvailable".
 * @returns {Promise<QuantumDevice[]>} - A promise that resolves with an array of quantum devices.
 * @throws {Error} - If the API key is invalid or the API call fails.
 */

export async function getQuantumDevices(
  apiKey: string,
  filters?: Record<string, string>
): Promise<QuantumDevice[]> {
  const url = new URL(QUANTUM_DEVICES_ENDPOINT);
  // console.log("url", url);
  const allowedFilters = ["provider", "type", "status", "isAvailable"];
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (allowedFilters.includes(key)) {
        url.searchParams.append(key, value);
      } else {
        console.warn(`Ignoring invalid filter: ${key}`);
      }
    });
  }
  // console.log("appended url", url);
  const response = await fetch(url.toString(), {
    method: "GET",
    headers: { "api-key": apiKey },
  });
  // console.log("response", response);

  if (response.status === 401) {
    throw new Error("Invalid API key. Please update your qBraid API key.");
  }
  if (!response.ok) {
    const errTxt: string = await response.text();
    throw new Error(`Get devices failed: ${response.status} - ${errTxt}`);
  }

  const resData = await response.json();
  // console.log(`From qbraidApi :`, resData);
  if (Array.isArray(resData) && resData.every(isQuantumDevice)) {
    log(`Get Devices Response: ${JSON.stringify(resData, null, 2)}`);
    // console.log(typeof resData);
    const limitedResData = resData.slice(0, 10);
    return limitedResData;
  } else {
    console.error("Unexpected response format:", resData);
    throw new Error("Invalid response format from getQuantumDevices API.");
  }
}

/**
 * Type guard to check if the provided data is a valid QuantumDevice.
 *
 * @param {unknown} data - The data to check.
 * @returns {boolean} - True if the data is a QuantumDevice, false otherwise.
 */

function isQuantumDevice(data: unknown): data is QuantumDevice {
  return (
    typeof data === "object" &&
    data !== null &&
    "name" in data &&
    typeof (data as any).name === "string" &&
    "provider" in data &&
    typeof (data as any).provider === "string" &&
    "deviceDescription" in data &&
    (typeof (data as any).deviceDescription === "string" ||
      (data as any).deviceDescription === null)
  );
}

/**
 * Fetches a list of available chat models.
 *
 * @param {string} apiKey - The API key for authentication.
 * @returns {Promise<ChatModel[]>} - A promise that resolves with an array of chat models.
 * @throws {Error} - If the API key is invalid or the API call fails.
 */

export async function fetchModels(apiKey: string): Promise<ChatModel[]> {
  const resp = await fetch(CHAT_MODELS_ENDPOINT, {
    headers: { "api-key": apiKey },
  });

  if (resp.status === 401) {
    throw new Error("Invalid API key. Please update your qBraid API key.");
  }
  if (!resp.ok) {
    throw new Error(`Failed to fetch models: ${resp.statusText}`);
  }

  const data = (await resp.json()) as ChatModel[];
  log(`Fetch Models Response: ${JSON.stringify(data, null, 2)}`);
  return data;
}

/**
 * Sends a chat message to the specified model.
 *
 * @param {string} apiKey - The API key for authentication.
 * @param {string} prompt - The chat message to send.
 * @param {string} [model="gpt-4o-mini"] - The name of the chat model to use (default: "gpt-4o-mini").
 * @param {boolean} [stream=false] - Whether to stream the response (default: false).
 * @returns {Promise<string>} - A promise that resolves with the chat response.
 * @throws {Error} - If the API key is invalid or the API call fails.
 */

export async function sendChat(
  apiKey: string,
  prompt: string,
  model: string = "gpt-4o-mini",
  stream: boolean = false
): Promise<string> {
  const response = await fetch(CHAT_ENDPOINT, {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      model,
      stream,
    }),
  });

  if (response.status === 401) {
    throw new Error("Invalid API key. Please update your qBraid API key.");
  }
  if (!response.ok) {
    const errTxt = await response.text();
    throw new Error(`Send Chat failed: ${response.status} - ${errTxt}`);
  }

  const data = await response.json();
  if (isChatResponse(data)) {
    log(`Send Chat Response: ${JSON.stringify(data)}`);
    return data.content || "";
  } else {
    throw new Error("Invalid response format");
  }
}

/**
 * Type guard to check if the provided data is a valid chat response.
 *
 * @param {unknown} data - The data to check.
 * @returns {boolean} - True if the data is a chat response, false otherwise.
 */

function isChatResponse(data: unknown): data is { content: string } {
  return (
    typeof data === "object" &&
    data !== null &&
    "content" in data &&
    typeof (data as any).content === "string"
  );
}
