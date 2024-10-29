export default class VectorVault {
    constructor(embeddingsModel = null) {
        this.embeddingsModel = embeddingsModel;
        this.accessToken = null;
        this.refreshToken = null;
        this.tokenExpiresAt = null;
        this.baseUrl = 'https://api.vectorvault.io'
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

    // Method to log in the user and obtain JWT tokens via API
    async loginWithApiKey(apiKey) {
        const url = `${this.baseUrl}/login_api_key`;

        const data = {
            api_key: apiKey
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
            throw new Error("API Key Login failed: " + error.error);
        }
    }

    // Method to refresh the access token using the refresh token
    async refreshAccessToken() {
        const url = `${this.baseUrl}/refresh`;

        const data = {
            refresh_token: this.refreshToken
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

            // Update the token expiration time
            const payload = JSON.parse(atob(this.accessToken.split('.')[1]));
            this.tokenExpiresAt = payload.exp * 1000;
            return true;
        } else {
            // Refresh token is invalid or expired
            this.accessToken = null;
            this.refreshToken = null;
            this.tokenExpiresAt = null;
            return false;
        }
    }

    // Helper method to make authenticated API requests
    async makeAuthenticatedRequest(url, options = {}) {
        // Check if the access token is expired or about to expire in the next minute
        const now = Date.now();
        if (this.tokenExpiresAt - now < 60000) { // 1 minute buffer
            const refreshed = await this.refreshAccessToken();
            if (!refreshed) {
                throw new Error("Session expired. Please log in again.");
            }
        }

        // Add the Authorization header with the access token
        options.headers = options.headers || {};
        options.headers['Authorization'] = `Bearer ${this.accessToken}`;
        options.headers['Content-Type'] = 'application/json';

        const response = await fetch(url, options);

        if (response.ok) {
            return response;
        } else if (response.status === 401) {
            // Access token might have expired, try refreshing
            const refreshed = await this.refreshAccessToken();
            if (refreshed) {
                // Retry the request with the new access token
                options.headers['Authorization'] = `Bearer ${this.accessToken}`;
                const retryResponse = await fetch(url, options);
                if (retryResponse.ok) {
                    return retryResponse;
                } else {
                    const error = await retryResponse.json();
                    throw new Error(`Request failed: ${error.error}`);
                }
            } else {
                throw new Error("Session expired. Please log in again.");
            }
        } else {
            const error = await response.json();
            throw new Error(`Request failed: ${error.error}`);
        }
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
                    if (word !== '!END') {
                        callback(word); // Call the callback function with the data
                    }
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


    // Method to run a flow with streaming response
    async runFlowStream(flowName, message, history = '', callbacks = {}) {
        const url = `${this.baseUrl}/flow-stream`;
        
        const data = {
            email: this.email,
            flow_id: flowName,
            message,
            history
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

    // Method to log out the user
    logout() {
        this.accessToken = null;
        this.refreshToken = null;
        this.tokenExpiresAt = null;
    }
}