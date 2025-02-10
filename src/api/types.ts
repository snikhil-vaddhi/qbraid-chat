// src/api/types.ts

export interface QuantumJob {
  _id: string;
  qbraidJobId: string;
  status: string;
  qbraidDeviceId: string;
  shots: number;
  timeStamps: {
    createdAt: string;
    endedAt?: string;
  };
  cost?: number;
  escrow?: number;
}

export interface DeleteJobResponse {
  message: string;
  job: QuantumJob;
}

export interface ResData {
  jobsArray: QuantumJob[];
  statusGroup: string;
  provider: string;
  total: number;
}

export interface QuantumDevice {
  qbraid_id: string;
  name: string;
  provider: string;
  // vendor: string;
  deviceDescription: string | null;
  // numberQubits: number;
  // pendingJobs: number;
  // paradigm: string;
  // type: "QPU" | "Simulator";
  // runPackage: string;
  // status: string;
  // statusMsg: string;
  // isAvailable: boolean;
  nextAvailable: string;
  // pricing: {
  //   perTask: number;
  //   perShot: number;
  //   perMinute: number;
  // };
}

export interface ChatModel {
  pricing: {
    units: string;
    input: number;
    output: number;
  };
  model: string;
  description: string;
}
