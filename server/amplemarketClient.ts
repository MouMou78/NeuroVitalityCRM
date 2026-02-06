import axios, { AxiosInstance, AxiosRequestConfig } from "axios";

/**
 * Unified Amplemarket API client with proper authentication and comprehensive logging
 */
export class AmplemarketClient {
  private client: AxiosInstance;
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.client = axios.create({
      baseURL: "https://api.amplemarket.com",
      headers: {
        "Content-Type": "application/json",
        // Amplemarket uses Bearer token authentication
        "Authorization": `Bearer ${apiKey}`,
      },
    });

    // Add request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        console.log("[Amplemarket API] Outbound Request:", {
          method: config.method?.toUpperCase(),
          path: config.url, // Path only, no secrets
          authMethod: "Authorization: Bearer", // Header name only
          hasApiKey: !!this.apiKey, // Boolean, not the value
          contentType: config.headers["Content-Type"],
        });
        return config;
      },
      (error) => {
        console.error("[Amplemarket API] Request Error:", error.message);
        return Promise.reject(error);
      }
    );

    // Add response interceptor for logging
    this.client.interceptors.response.use(
      (response) => {
        console.log("[Amplemarket API] Response:", {
          status: response.status,
          path: response.config.url,
          dataKeys: Object.keys(response.data || {}),
        });
        return response;
      },
      (error) => {
        console.error("[Amplemarket API] Response Error:", {
          status: error.response?.status,
          statusText: error.response?.statusText,
          path: error.config?.url,
          responseBody: error.response?.data,
          message: error.message,
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Get list of users from Amplemarket
   */
  async getUsers() {
    const response = await this.client.get("/users");
    return response.data;
  }

  /**
   * Get list of lead lists from Amplemarket
   */
  async getLists() {
    const response = await this.client.get("/lead-lists");
    return response.data;
  }

  /**
   * Get list of sequences from Amplemarket
   */
  async getSequences() {
    const response = await this.client.get("/sequences");
    return response.data;
  }

  /**
   * Get contacts from Amplemarket
   */
  async getContacts(params?: { list_id?: string; limit?: number; offset?: number }) {
    const response = await this.client.get("/contacts", { params });
    return response.data;
  }

  /**
   * Get accounts from Amplemarket
   */
  async getAccounts(params?: { limit?: number; offset?: number }) {
    const response = await this.client.get("/accounts", { params });
    return response.data;
  }
}

/**
 * Create an Amplemarket client instance with the given API key
 */
export function createAmplemarketClient(apiKey: string): AmplemarketClient {
  if (!apiKey) {
    throw new Error("Amplemarket API key is required");
  }
  return new AmplemarketClient(apiKey);
}
