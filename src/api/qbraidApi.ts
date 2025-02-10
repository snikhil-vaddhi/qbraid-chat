// src/api/qbraidApi.ts
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
    return resData as QuantumJob; // Replace `QuantumJob` with the correct type if needed
  } else {
    throw new Error("Invalid response format");
  }
}

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
    return { message: resData.message }; // Return the message
  } else {
    throw new Error("Invalid response format");
  }
}

function isMessageResponse(data: unknown): data is { message: string } {
  return (
    typeof data === "object" &&
    data !== null &&
    "message" in data &&
    typeof (data as any).message === "string"
  );
}

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

  // Validate that resData contains 'data' and 'message'
  if (
    resData &&
    typeof resData === "object" &&
    "data" in resData &&
    "message" in resData
  ) {
    const jobData = (resData as any).data; // Extract the nested 'data' field
    const message = (resData as any).message; // Extract the 'message' field

    // Validate that 'data' is a valid QuantumJob
    if (isQuantumJob(jobData)) {
      return {
        message, // Include the success message
        job: jobData, // Include the validated QuantumJob object
      };
    } else {
      throw new Error("Invalid job data format");
    }
  } else {
    throw new Error("Invalid response format");
  }
}

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

function isChatResponse(data: unknown): data is { content: string } {
  return (
    typeof data === "object" &&
    data !== null &&
    "content" in data &&
    typeof (data as any).content === "string"
  );
}
