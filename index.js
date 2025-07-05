export default class VectorVault {
    constructor(embeddingsModel = null) {
        this.embeddingsModel = embeddingsModel;
        this.accessToken = null;
        this.refreshToken = null;
        this.tokenExpiresAt = null;
        this.baseUrl = 'https://api.vectorvault.io'
        this.deploymentId = null;
    }

    async initializeDeployment(email, deploymentId) {
        const url = `${this.baseUrl}/init_deployment`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Deployment-ID': deploymentId,
                'X-Email': email
            }
        });

        if (response.ok) {
            const json = await response.json();
            this.accessToken = json.access_token;
            this.refreshToken = json.refresh_token;
            this.deploymentId = deploymentId;

            const payload = JSON.parse(atob(this.accessToken.split('.')[1]));
            this.tokenExpiresAt = payload.exp * 1000;
        } else {
            const error = await response.json();
            throw new Error("Deployment initialization failed: " + error.error);
        }
    }

    // Resilient makeRequest
    async makeAuthenticatedRequest(url, options = {}, maxRetries = 2) {
        for (let attempt = 0; attempt < maxRetries + 1; attempt++) {
          try {
            // Check token expiration
            const now = Date.now();
            if (this.tokenExpiresAt - now < 60000) {
              const refreshed = await this.refreshAccessToken();
              if (!refreshed) {
                throw new Error("Session expired. Please log in again.");
              }
            }
            
            options.headers = options.headers || {};
            options.headers['Authorization'] = `Bearer ${this.accessToken}`;
            if (!options.headers['Content-Type'] && !(options.body instanceof FormData)) {
              options.headers['Content-Type'] = 'application/json';
            }
            
            const response = await fetch(url, options);
            
            // Handle 404 errors specifically
            if (response.status === 404) {
              console.warn(`404 error on attempt ${attempt+1} - refreshing token and retrying`);
              await this.refreshAccessToken();
              
              if (attempt < maxRetries) {
                const waitTime = Math.pow(2, attempt) * 1000;
                await new Promise(resolve => setTimeout(resolve, waitTime));
                continue;
              } else {
                throw new Error("Endpoint not found after multiple attempts.");
              }
            }
            
            if (response.ok) {
              return response;
            } else if (response.status === 401) {
              const refreshed = await this.refreshAccessToken();
              if (refreshed && attempt < maxRetries) {
                options.headers['Authorization'] = `Bearer ${this.accessToken}`;
                // Wait before retry
                const waitTime = Math.pow(2, attempt) * 1000;
                await new Promise(resolve => setTimeout(resolve, waitTime));
                continue;
              } else {
                throw new Error("Session expired. Please log in again.");
              }
            } else {
              let errorMessage = "Request failed";
              try {
                const error = await response.json();
                errorMessage = `${errorMessage}: ${error.error || error.message || response.statusText}`;
              } catch (e) {
                errorMessage = `${errorMessage}: ${response.statusText || response.status}`;
              }
              throw new Error(errorMessage);
            }
          } catch (error) {
            if (attempt === maxRetries) {
              throw error; // Rethrow on last attempt
            }
            
            // For network errors, retry with backoff
            const waitTime = Math.pow(2, attempt) * 1000;
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }
        }
    }

    // Method to log in the user and obtain JWT tokens
    async login(email, password) {
        const url = `${this.baseUrl}/login`;

        const data = {
            email: email,
            password: password
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            const json = await response.json();
            this.accessToken = json.access_token;
            this.refreshToken = json.refresh_token;

            // Decode the JWT to get the expiration time
            const payload = JSON.parse(atob(this.accessToken.split('.')[1]));
            // JWT 'exp' claim is in seconds, convert to milliseconds
            this.tokenExpiresAt = payload.exp * 1000;
        } else {
            const error = await response.json();
            throw new Error("Login failed: " + error.error);
        }
    }

    // Method to refresh the access token using the refresh token
    // Improved refreshAccessToken method
    async refreshAccessToken(maxRetries = 3) {
        const url = `${this.baseUrl}/refresh`;
        
        for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.refreshToken}`,
            },
            });
            
            // Handle 404 errors specifically
            if (response.status === 404) {
            console.warn(`404 error encountered on refresh attempt ${attempt+1} - token endpoint not found or token invalid`);
            
            // Wait with exponential backoff before retry
            if (attempt < maxRetries - 1) {
                const waitTime = Math.pow(2, attempt) * 1000; // exponential backoff in ms
                await new Promise(resolve => setTimeout(resolve, waitTime));
                continue;
            }
            }
            
            if (response.ok) {
            const json = await response.json();
            this.accessToken = json.access_token;
            
            // Update the token expiration time
            const payload = JSON.parse(atob(this.accessToken.split('.')[1]));
            this.tokenExpiresAt = payload.exp * 1000;
            return true;
            } else {
            // For other errors, if not the last attempt, try again
            if (attempt < maxRetries - 1) {
                const waitTime = Math.pow(2, attempt) * 1000;
                await new Promise(resolve => setTimeout(resolve, waitTime));
            } else {
                // Last attempt failed
                this.accessToken = null;
                this.refreshToken = null;
                this.tokenExpiresAt = null;
                return false;
            }
            }
        } catch (error) {
            console.error(`Error during token refresh attempt ${attempt+1}:`, error);
            
            // For network errors, retry with backoff if not last attempt
            if (attempt < maxRetries - 1) {
            const waitTime = Math.pow(2, attempt) * 1000;
            await new Promise(resolve => setTimeout(resolve, waitTime));
            } else {
            this.accessToken = null;
            this.refreshToken = null;
            this.tokenExpiresAt = null;
            return false;
            }
        }
        }
        
        return false;
    }


    getAccessToken() {
      return this.accessToken;
    }
  
    getRefreshToken() {
      return this.refreshToken;
    }
  
    setAccessToken(token) {
      this.accessToken = token;
      // Update tokenExpiresAt based on the token's expiration
      const payload = JSON.parse(atob(token.split('.')[1]));
      this.tokenExpiresAt = payload.exp * 1000;
    }
  
    setRefreshToken(token) {
      this.refreshToken = token;
    }

    // Method to get chat response
    async getChat(params) {
        const url = `${this.baseUrl}/get_chat`;

        const data = {
            vault: '',
            embeddings_model: this.embeddingsModel,
            text: '',
            history: null,
            summary: false,
            get_context: false,
            n_context: 4,
            return_context: false,
            smart_history_search: false,
            model: "gpt-4o",
            include_context_meta: false,
            custom_prompt: false,
            temperature: 0,
            timeout: 45,
            ...params
        };

        const response = await this.makeAuthenticatedRequest(url, {
            method: 'POST',
            body: JSON.stringify(data)
        });

        return response.json();
    }

    // Method to get chat response with streaming
    async getChatStream(params, callback) {
        const url = `${this.baseUrl}/stream`;

        const data = {
            vault: '',
            embeddings_model: this.embeddingsModel,
            text: '',
            history: null,
            summary: false,
            get_context: false,
            n_context: 4,
            return_context: false,
            smart_history_search: false,
            model: "gpt-4o",
            include_context_meta: false,
            metatag: [],
            metatag_prefixes: [],
            metatag_suffixes: [],
            custom_prompt: false,
            temperature: 0,
            timeout: 45,
            ...params
        };

        const response = await this.makeAuthenticatedRequest(url, {
            method: 'POST',
            body: JSON.stringify(data)
        });

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const textChunk = decoder.decode(value, { stream: true });
            const lines = textChunk.split('\n');
            for (let line of lines) {
                if (line.startsWith('data:')) {
                    const jsonData = JSON.parse(line.substring('data: '.length));
                    const word = jsonData['data'];
                    callback(word); 
                }
            }
        }
    }

    // Method to download data to JSON
    async downloadToJson(params) {
        const url = `${this.baseUrl}/download_to_json`;

        const data = {
            vault: '',
            return_meta: false,
            ...params
        };

        const response = await this.makeAuthenticatedRequest(url, {
            method: 'POST',
            body: JSON.stringify(data)
        });

        return response.json();
    }

    // Method to upload data from JSON
    async uploadFromJson(vault, jsonData) {
        const url = `${this.baseUrl}/upload_from_json`;

        const data = {
            embeddings_model: this.embeddingsModel,
            vault: vault,
            json: jsonData
        };

        const response = await this.makeAuthenticatedRequest(url, {
            method: 'POST',
            body: JSON.stringify(data)
        });

        return response.json();
    }

    // Method to edit an item
    async editItem(vault, itemId, newText) {
        const url = `${this.baseUrl}/edit_item`;

        const data = {
            embeddings_model: this.embeddingsModel,
            vault: vault,
            item_id: itemId,
            text: newText
        };

        const response = await this.makeAuthenticatedRequest(url, {
            method: 'POST',
            body: JSON.stringify(data)
        });

        return response.json();
    }

    // Method to get total items
    async getTotalItems(vault) {
        const url = `${this.baseUrl}/get_total_items`;

        const data = {
            vault: vault
        };

        const response = await this.makeAuthenticatedRequest(url, {
            method: 'POST',
            body: JSON.stringify(data)
        });

        return response.json();
    }

    // Method to delete the entire vault
    async deleteVault(vault) {
        // deletes entire vault
        const url = `${this.baseUrl}/delete_vault`;

        const data = {
            vault: vault
        };

        const response = await this.makeAuthenticatedRequest(url, {
            method: 'POST',
            body: JSON.stringify(data)
        });

        return response.json();
    }

    // Method to delete specific items
    async deleteItems(vault, itemIds) {
        // itemIds is a list of integers. If you only have one item to delete, pass in a list with the single item id inside 
        // (i.e. [252])
        // (i.e. [1, 2, 3, 4, 5, 6])
        const url = `${this.baseUrl}/delete_items`;

        const data = {
            vault: vault,
            item_ids: itemIds
        };

        const response = await this.makeAuthenticatedRequest(url, {
            method: 'POST',
            body: JSON.stringify(data)
        });

        return response.json();
    }

    // Method to add cloud data
    async addCloud(params) {
        const url = `${this.baseUrl}/add_cloud`;

        const data = {
            vault: '',
            embeddings_model: this.embeddingsModel,
            text: '',
            meta: null,
            name: null,
            split: false,
            split_size: 1000,
            gen_sum: false,
            ...params
        };

        const response = await this.makeAuthenticatedRequest(url, {
            method: 'POST',
            body: JSON.stringify(data)
        });

        return response.json();
    }

    // Method to add website content by URL
    async addSite(params) {
        const url = `${this.baseUrl}/add_site`;

        const data = {
            vault: '',
            embeddings_model: this.embeddingsModel,
            site: '',
            ...params
        };

        const response = await this.makeAuthenticatedRequest(url, {
            method: 'POST',
            body: JSON.stringify(data)
        });

        return response.json();
    }

    // Method to get list of vaults
    async getVaults(searchVault = null) {
        const url = `${this.baseUrl}/get_vaults`;

        const data = {
            search_vault: searchVault
        };

        const response = await this.makeAuthenticatedRequest(url, {
            method: 'POST',
            body: JSON.stringify(data)
        });

        return response.json();
    }

    // Method to get account data
    async getAccountData() {
        const url = `${this.baseUrl}/get_vault_data`;

        const response = await this.makeAuthenticatedRequest(url, {
            method: 'POST',
            body: JSON.stringify({})
        });

        const res = await response.json();
        return res.vault_data;
    }

    // Method to get distance between two items
    async getDistance(vault, id1, id2) {
        const url = `${this.baseUrl}/get_distance`;

        const data = {
            vault: vault,
            id1: id1,
            id2: id2
        };

        const response = await this.makeAuthenticatedRequest(url, {
            method: 'POST',
            body: JSON.stringify(data)
        });

        return response.json();
    }

    // Method to get similar items
    async getSimilar(params) {
        const url = `${this.baseUrl}/get_similar`;

        const data = {
            embeddings_model: this.embeddingsModel,
            vault: '',
            text: '',
            num_items: 4,
            include_distances: false,
            ...params
        };

        const response = await this.makeAuthenticatedRequest(url, {
            method: 'POST',
            body: JSON.stringify(data)
        });

        return response.json();
    }

    // Method to save personality message
    async savePersonalityMessage(vault, personalityMessage) {
        const url = `${this.baseUrl}/save_personality_message`;

        const data = {
            vault: vault,
            personality_message: personalityMessage
        };

        const response = await this.makeAuthenticatedRequest(url, {
            method: 'POST',
            body: JSON.stringify(data)
        });

        return response.json();
    }

    // Method to save custom prompt
    async saveCustomPrompt(vault, customPrompt) {
        const url = `${this.baseUrl}/save_custom_prompt`;

        const data = {
            vault: vault,
            prompt: customPrompt
        };

        const response = await this.makeAuthenticatedRequest(url, {
            method: 'POST',
            body: JSON.stringify(data)
        });

        return response.json();
    }

    // Method to fetch personality message
    async fetchPersonalityMessage(vault) {
        const url = `${this.baseUrl}/fetch_personality_message`;

        const data = {
            vault: vault
        };

        const response = await this.makeAuthenticatedRequest(url, {
            method: 'POST',
            body: JSON.stringify(data)
        });

        return response.json();
    }

    // Method to fetch custom prompt
    async fetchCustomPrompt(vault) {
        const url = `${this.baseUrl}/fetch_custom_prompt`;

        const data = {
            vault: vault
        };

        const response = await this.makeAuthenticatedRequest(url, {
            method: 'POST',
            body: JSON.stringify(data)
        });

        return response.json();
    }

    // Method to fetch 3D map data
    async fetch3DMap(vault, highlightId = null) {
        const url = `${this.baseUrl}/get_map`;

        const data = {
            vault: vault,
            highlight_id: highlightId
        };

        const response = await this.makeAuthenticatedRequest(url, {
            method: 'POST',
            body: JSON.stringify(data)
        });

        return response.json();
    }

    // Method to get items by IDs
    async getItems(vault, itemIds) {
        const url = `${this.baseUrl}/get_items`;

        const data = {
            vault: vault,
            item_ids: itemIds
        };

        const response = await this.makeAuthenticatedRequest(url, {
            method: 'POST',
            body: JSON.stringify(data)
        });

        return response.json();
    }

    // Method to run a flow without streaming response
    async runFlow(flowName, message, history = '', conversation_user_id = null, session_id = null, invoke_method = null, internal_vars = null, callbacks = {}) {
        const url = `${this.baseUrl}/flow`;

        const data = {
            email: this.email,
            flow_id: flowName,
            message,
            history,
            conversation_user_id: conversation_user_id,
            session_id: session_id, 
            invoke_method: invoke_method, 
            internal_vars: internal_vars, 
        };

        try {
            const response = await this.makeAuthenticatedRequest(url, {
                method: 'POST',
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const responseData = await response.json();
            let logs = [];
            let fullResponse = '';

            if (responseData.status === 'success') {
                fullResponse = responseData.response;
                if (callbacks.onMessage) callbacks.onMessage(fullResponse);
            } else {
                throw new Error(responseData.response);
            }

            if (callbacks.onLog) callbacks.onLog(`Flow ${flowName} executed successfully.`);

            return { response: fullResponse, logs };
        } catch (error) {
            console.error('Error running flow:', error);
            if (callbacks.onError) callbacks.onError(error);
            return { response: '', logs: [`Error: ${error.message}`] };
        }
    }

    // Method to run a flow with streaming response
    async runFlowStream(flowName, message, history = '', conversation_user_id = null, session_id = null, invoke_method = null, internal_vars = null, callbacks = {}) {
        const url = `${this.baseUrl}/flow-stream`;
        
        const data = {
            email: this.email,
            flow_id: flowName,
            message,
            history,
            conversation_user_id: conversation_user_id,
            session_id: session_id, 
            invoke_method: invoke_method, 
            internal_vars: internal_vars, 
        };

        const response = await this.makeAuthenticatedRequest(url, {
            method: 'POST',
            body: JSON.stringify(data)
        });

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullResponse = '';
        let logs = [];
        let currentEventType = null;
        let currentData = '';

        // Process the stream
        while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');
            
            for (const line of lines) {
                if (line.startsWith('event: ')) {
                    // Process any previously accumulated data
                    if (currentData) {
                        processEventData(currentEventType, currentData, callbacks);
                    }
                    
                    currentEventType = line.slice(7).trim();
                    currentData = '';
                } else if (line.startsWith('data: ')) {
                    currentData += line.slice(6);
                }
            }
        }

        // Process any remaining data
        if (currentData) {
            processEventData(currentEventType, currentData, callbacks);
        }

        return { response: fullResponse, logs };

        function processEventData(eventType, data, callbacks) {
            try {
                const parsedData = JSON.parse(data);
                if (eventType === 'log') {
                    logs.push(parsedData);
                    if (callbacks.onLog) callbacks.onLog(parsedData);
                } else if (eventType === 'message') {
                    fullResponse += parsedData;
                    if (callbacks.onMessage) callbacks.onMessage(parsedData);
                }
            } catch (e) {
                console.error('Error parsing data:', e);
                // If parsing fails, treat it as plain text
                if (eventType === 'log') {
                    logs.push(data);
                    if (callbacks.onLog) callbacks.onLog(data);
                } else if (eventType === 'message') {
                    fullResponse += data;
                    if (callbacks.onMessage) callbacks.onMessage(data);
                }
            }
        }
    }

    // Method to upload a PDF file to a vault
    async uploadPdf(pdfFile, vault, options = {}) {
        const url = `${this.baseUrl}/pdf_upload`;
        
        // Validate inputs
        if (!pdfFile || !vault) {
            throw new Error('PDF file and vault name are required');
        }
        
        // Create form data
        const formData = new FormData();
        formData.append('pdf_file', pdfFile);
        formData.append('vault_name', vault);
        
        // Add optional parameters
        if (options.summarize !== undefined) {
            formData.append('summarize', options.summarize.toString());
        }
        
        if (options.splitSize) {
            formData.append('split_size', options.splitSize.toString());
        }
        
        // Make the authenticated request
        const now = Date.now();
        if (this.tokenExpiresAt - now < 60000) {
            const refreshed = await this.refreshAccessToken();
            if (!refreshed) {
                throw new Error('Session expired. Please log in again.');
            }
        }
        
        // Send the request with proper headers but don't set Content-Type
        // as FormData will set it automatically with the correct boundary
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`
            },
            body: formData
        });
        
        // Handle response
        if (response.ok) {
            return response.json();
        } else if (response.status === 401) {
            // Try to refresh token and retry
            const refreshed = await this.refreshAccessToken();
            if (refreshed) {
                const retryResponse = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`
                    },
                    body: formData
                });
                
                if (retryResponse.ok) {
                    return retryResponse.json();
                } else {
                    const error = await retryResponse.json();
                    throw new Error(`Request failed: ${error.message || error.error}`);
                }
            } else {
                throw new Error('Session expired. Please log in again.');
            }
        } else {
            const error = await response.json();
            throw new Error(`PDF upload failed: ${error.message || error.error}`);
        }
    }

    
    // Method to log out the user
    logout() {
        this.accessToken = null;
        this.refreshToken = null;
        this.tokenExpiresAt = null;
    }
}