// index.d.ts
declare module 'vectorvault' {
  // Optional: define an interface for the callbacks used in runFlow and runFlowStream
  interface FlowCallbacks {
    onMessage?: (partialMessage: string) => void;
    onLog?: (logData: any) => void;
    onError?: (error: any) => void;
  }

  // Optional: define a return structure for runFlow and runFlowStream
  interface FlowResult {
    response: string;
    logs: any[];
  }
  
  // Define PDF upload options interface
  interface PDFUploadOptions {
    summarize?: boolean;
    splitSize?: number;
  }

  export default class VectorVault {
    constructor(embeddingsModel?: string | null);

    // Public fields
    embeddingsModel: string | null;
    accessToken: string | null;
    refreshToken: string | null;
    tokenExpiresAt: number | null;
    baseUrl: string;
    deploymentId: string | null;

    // Methods
    initializeDeployment(email: string, deploymentId: string): Promise<void>;
    makeAuthenticatedRequest(url: string, options?: RequestInit): Promise<Response>;
    login(email: string, password: string): Promise<void>;
    refreshAccessToken(): Promise<boolean>;

    getAccessToken(): string | null;
    getRefreshToken(): string | null;
    setAccessToken(token: string): void;
    setRefreshToken(token: string): void;

    getChat(params: Record<string, any>): Promise<any>;
    getChatStream(params: Record<string, any>, callback: (word: any) => void): Promise<void>;

    downloadToJson(params: Record<string, any>): Promise<any>;
    uploadFromJson(vault: string, jsonData: Record<string, any>): Promise<any>;
    editItem(vault: string, itemId: number, newText: string): Promise<any>;
    getTotalItems(vault: string): Promise<any>;
    deleteVault(vault: string): Promise<any>;
    deleteItems(vault: string, itemIds: number[]): Promise<any>;
    addCloud(params: Record<string, any>): Promise<any>;
    addSite(params: Record<string, any>): Promise<any>;
    getVaults(searchVault?: string | null): Promise<any>;
    getAccountData(): Promise<any>;
    getDistance(vault: string, id1: number, id2: number): Promise<any>;
    getSimilar(params: Record<string, any>): Promise<any>;
    savePersonalityMessage(vault: string, personalityMessage: string): Promise<any>;
    saveCustomPrompt(vault: string, customPrompt: string): Promise<any>;
    fetchPersonalityMessage(vault: string): Promise<any>;
    fetchCustomPrompt(vault: string): Promise<any>;
    fetch3DMap(vault: string, highlightId?: number | null): Promise<any>;
    getItems(vault: string, itemIds: number[]): Promise<any>;
    
    // New PDF upload method
    uploadPdf(
      pdfFile: File, 
      vault: string, 
      options?: PDFUploadOptions
    ): Promise<{
      status: string;
      message: string;
      items_added?: number;
    }>;

    runFlow(
      flowName: string,
      message: string,
      history?: string,
      callbacks?: FlowCallbacks
    ): Promise<FlowResult>;

    runFlowStream(
      flowName: string,
      message: string,
      history?: string,
      callbacks?: FlowCallbacks
    ): Promise<FlowResult>;

    logout(): void;
  }
}