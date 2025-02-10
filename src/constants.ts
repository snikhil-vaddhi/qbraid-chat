/**
 * The base URL for all qBraid API requests.
 */
export const QBRAID_API_BASE_URL = "https://api.qbraid.com/api";

/**
 * Endpoint for fetching available chat models from the qBraid API.
 * Use this endpoint to retrieve metadata about supported chat models.
 *
 * Example: GET `${CHAT_MODELS_ENDPOINT}`
 */
export const CHAT_MODELS_ENDPOINT = `${QBRAID_API_BASE_URL}/chat/models`;

/**
 * Endpoint for interacting with the chat service in the qBraid API.
 * Use this endpoint to send prompts and receive responses from language models.
 *
 * Example: POST `${CHAT_ENDPOINT}`
 */
export const CHAT_ENDPOINT = `${QBRAID_API_BASE_URL}/chat`;

/**
 * Endpoint for managing quantum jobs in the qBraid API.
 * Use this endpoint to create, list, cancel, or delete quantum jobs.
 *
 * Example: POST/GET `${QUANTUM_JOBS_ENDPOINT}`
 */
export const QUANTUM_JOBS_ENDPOINT = `${QBRAID_API_BASE_URL}/quantum-jobs`;

/**
 * Endpoint for retrieving information about available quantum devices.
 * Use this endpoint to fetch metadata about quantum devices, including their availability and specifications.
 *
 * Example: GET `${QUANTUM_DEVICES_ENDPOINT}`
 */
export const QUANTUM_DEVICES_ENDPOINT = `${QBRAID_API_BASE_URL}/quantum-devices`;
