/**
 * Represents a quantum job submitted to the qBraid platform.
 */
export interface QuantumJob {
  /** Unique identifier for the quantum job. */
  _id: string;

  /** Unique qBraid job ID. */
  qbraidJobId: string;

  /** Current status of the quantum job (e.g., "pending", "completed"). */
  status: string;

  /** ID of the quantum device used for the job. */
  qbraidDeviceId: string;

  /** Number of shots (repetitions) for the quantum job. */
  shots: number;

  /** Timestamps related to the job's lifecycle. */
  timeStamps: {
    /** The timestamp when the job was created. */
    createdAt: string;

    /** The timestamp when the job ended (optional). */
    endedAt?: string;
  };

  /** Cost associated with running the quantum job (optional). */
  cost?: number;

  /** Escrow amount allocated for the quantum job (optional). */
  escrow?: number;
}

/**
 * Represents the response returned after deleting a quantum job.
 */
export interface DeleteJobResponse {
  /** Message indicating the result of the delete operation. */
  message: string;

  /** The deleted quantum job details. */
  job: QuantumJob;
}

/**
 * Represents a response containing a list of quantum jobs and metadata.
 */
export interface ResData {
  /** Array of quantum jobs returned in the response. */
  jobsArray: QuantumJob[];

  /** Grouping status of the jobs (e.g., "completed", "pending"). */
  statusGroup: string;

  /** Provider associated with the jobs (e.g., IBM, Rigetti). */
  provider: string;

  /** Total number of jobs matching the query. */
  total: number;
}

/**
 * Represents a quantum device available on the qBraid platform.
 */
export interface QuantumDevice {
  /** Unique identifier for the quantum device on qBraid. */
  qbraid_id: string;

  /** Name of the quantum device. */
  name: string;

  /** Provider or vendor of the quantum device (e.g., IBM, Rigetti). */
  provider: string;

  /**
   * Description of the device's capabilities or features.
   * Can be null if no description is provided.
   */
  deviceDescription: string | null;

  /**
   * Timestamp indicating when the device will next be available.
   * Useful for scheduling jobs on devices with limited availability.
   */
  nextAvailable: string;
}

/**
 * Represents a chat model available on the qBraid platform.
 */
export interface ChatModel {
  /**
   * Pricing information for using the chat model.
   * Includes units, input cost, and output cost.
   */
  pricing: {
    /** Units used for pricing (e.g., "tokens", "characters"). */
    units: string;

    /** Cost per input unit (e.g., tokens or characters). */
    input: number;

    /** Cost per output unit (e.g., tokens or characters). */
    output: number;
  };

  /** Name or identifier of the chat model (e.g., "gpt-4o-mini"). */
  model: string;

  /** Description of the chat model's capabilities and use cases. */
  description: string;
}
