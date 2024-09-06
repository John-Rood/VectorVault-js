export default class VectorVault {
    constructor(user, vault, apiKey, openAIKey=null, embeddingsModel=null) {
        this.user = user;
        this.vault = vault;
        this.apiKey = apiKey;
        this.openAIKey = openAIKey;
        this.embeddingsModel = embeddingsModel;
    }

    getChat(params) {
        const url = "https://api.vectorvault.io/get_chat";
        
        const data = {
            user: this.user, 
            vault: this.vault,
            api_key: this.apiKey,
            openai_key: this.openAIKey,
            embeddings_model: this.embeddingsModel,
            text: '',
            history: null,
            summary: false,
            get_context: false,
            n_context: 4,
            return_context: false,
            smart_history_search: false,
            model: "gpt-3.5-turbo",
            include_context_meta: false,
            custom_prompt: false,
            temperature: 0,
            timeout: 45,
            ...params
        };

        // Send the POST request
        return fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        })
        .then(response => response.json());
    }

    async getChatStream(params, callback) {

        const url = "https://api.vectorvault.io/stream";

        const data = {
            user: this.user,
            vault: this.vault,
            api_key: this.apiKey,
            openai_key: this.openAIKey,
            embeddings_model: this.embeddingsModel,
            text: '',
            history: null,
            summary: false,
            get_context: false,
            n_context: 4,
            return_context: false,
            smart_history_search: false,
            model: "gpt-3.5-turbo",
            include_context_meta: false,
            metatag: [],
            metatag_prefixes: [],
            metatag_suffixes: [],
            custom_prompt: false,
            temperature: 0,
            timeout: 45,
            ...params
        };

        const response = await fetch(url, {
        method: 'POST',
        headers: {
        'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
        });

        const reader = response.body.getReader();

        while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const textChunk = new TextDecoder().decode(value, { stream: true });
        const lines = textChunk.split('\n');
        for (let line of lines) {
            if (line.startsWith('data:')) {
                const json_data = JSON.parse(line.substring('data: '.length));
                const word = json_data['data'] 
                if (word != '!END') {
                    callback(word); // Call the callback function with the data
                    }
                }
            }
        }
    }

    getItems(itemIds) {
        // itemIds must be a list of integers
        const url = "https://api.vectorvault.io/get_items";

        const data = {
            user: this.user,
            api_key: this.apiKey,
            vault: this.vault,
            item_ids: itemIds
        };

        // Send the POST request
        return fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        })
        .then(response => {
            if (response.ok) {
                return response.json();
            } else {
                return response.json().then(json => {
                    throw new Error("Failed: " + JSON.stringify(json));
                });
            }
        });
    }

    downloadToJson(params) {
        // itemIds must be a list of integers
        const url = "https://api.vectorvault.io/download_to_json";

        const data = {
            user: this.user,
            api_key: this.apiKey,
            vault: this.vault,
            return_meta: false,
            ...params
        };

        // Send the POST request
        return fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        })
        .then(response => {
            if (response.ok) {
                return response.json();
            } else {
                return response.json().then(json => {
                    throw new Error("Failed: " + JSON.stringify(json));
                });
            }
        });
    }

    uploadFromJson(json) {
        // itemIds must be a list of integers
        const url = "https://api.vectorvault.io/upload_from_json";

        const data = {
            user: this.user,
            api_key: this.apiKey,
            vault: this.vault,
            openai_key: this.openAIKey,
            embeddings_model: this.embeddingsModel,
            json: json
        };

        // Send the POST request
        return fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        })
        .then(response => {
            if (response.ok) {
                return response.json();
            } else {
                return response.json().then(json => {
                    throw new Error("Failed: " + JSON.stringify(json));
                });
            }
        });
    }

    editItem(itemId, newText) {
        const url = "https://api.vectorvault.io/edit_item";

        const data = {
            user: this.user,
            vault: this.vault,
            api_key: this.apiKey,
            openai_key: this.openAIKey,
            embeddings_model: this.embeddingsModel,
            item_id: itemId,
            text: newText
        };

        // Send the POST request
        return fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        })
        .then(response => response.json());
    }

    getTotalItems() {
        const url = "https://api.vectorvault.io/get_total_items";

        const data = {
            user: this.user,
            api_key: this.apiKey,
            vault: this.vault
        };

        // Send the POST request
        return fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        })
        .then(response => {
            if (response.ok) {
                return response.json();
            } else {
                return response.json().then(json => {
                    throw new Error("Failed: " + JSON.stringify(json));
                });
            }
        });
    }
    
    delete() {
        // deletes entire vault
        const url = "https://api.vectorvault.io/delete_vault";

        const data = {
            user: this.user,
            vault: this.vault,
            api_key: this.apiKey
        };

        // Send the POST request
        return fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        })
        .then(response => response.json());
    }
    
    deleteItems(itemIds) {
        // itemIds is a list of integers. If you only have one item to delete, pass in a list with the single item id inside 
        // (i.e. [252])
        // (i.e. [1, 2, 3, 4, 5, 6])

        const url = "https://api.vectorvault.io/delete_items";

        const data = {
            user: this.user,
            vault: this.vault,
            api_key: this.apiKey,
            item_ids: itemIds
        };

        // Send the POST request
        return fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        })
        .then(response => response.json());
    }

    addCloud(params) {
        const url = "https://api.vectorvault.io/add_cloud";

        const data = {
            user: this.user,
            vault: this.vault,
            api_key: this.apiKey,
            openai_key: this.openAIKey,
            embeddings_model: this.embeddingsModel,
            text: '',
            meta: null,
            name: null,
            split: false,
            split_size: 1000,
            gen_sum: false,
            ...params
        };

        // Send the POST request
        return fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        })
        .then(response => response.json());
    }

    addSite(params) {
        const url = "https://api.vectorvault.io/add_site";

        const data = {
            user: this.user,
            vault: this.vault,
            api_key: this.apiKey,
            openai_key: this.openAIKey,
            embeddings_model: this.embeddingsModel,
            site: '',
            ...params
        };

        // Send the POST request
        return fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        })
        .then(response => response.json());
    }

    getVaults(searchVault = null) {
        const url = "https://api.vectorvault.io/get_vaults";

        const data = {
            user: this.user,
            vault: this.vault,
            api_key: this.apiKey,
            search_vault: searchVault
        };

        // Send the POST request
        return fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        })
        .then(response => response.json());
    }
    
    getDistance(id1, id2) {
        const url = "https://api.vectorvault.io/get_distance";

        const data = {
            user: this.user,
            vault: this.vault,
            api_key: this.apiKey,
            id1: id1,
            id2: id2
        };

        // Send the POST request
        return fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        })
        .then(response => response.json());
    }

    getSimilar(params) {
        const url = "https://api.vectorvault.io/get_similar";

        const data = {
            user: this.user,
            vault: this.vault,
            api_key: this.apiKey,
            openai_key: this.openAIKey,
            embeddings_model: this.embeddingsModel,
            text: '',
            num_items: 4,
            include_distances: false,
            ...params 
        };

        // Send the POST request
        return fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        })
        .then(response => response.json());
    }

    savePersonalityMessage(personalityMessage) {
        const url = "https://api.vectorvault.io/save_personality_message";

        const data = {
            user: this.user,
            vault: this.vault,
            api_key: this.apiKey,
            personality_message: personalityMessage
        };

        // Send the POST request
        return fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        })
        .then(response => response.json());
    }

    saveCustomPrompt(customPrompt) {
        const url = "https://api.vectorvault.io/save_custom_prompt";

        const data = {
            user: this.user,
            vault: this.vault,
            api_key: this.apiKey,
            prompt: customPrompt
        };

        // Send the POST request
        return fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        })
        .then(response => response.json());
    }

    fetchPersonalityMessage() {
        const url = "https://api.vectorvault.io/fetch_personality_message";

        const data = {
            user: this.user,
            vault: this.vault,
            api_key: this.apiKey,
        };

        // Send the POST request
        return fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        })
        .then(response => response.json());
    }

    fetchCustomPrompt() {
        const url = "https://api.vectorvault.io/fetch_custom_prompt";

        const data = {
            user: this.user,
            vault: this.vault,
            api_key: this.apiKey,
        };

        // Send the POST request
        return fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        })
        .then(response => response.json());
    }

    fetch3DMap(highlightId = null) {
        const url = "https://api.vectorvault.io/get_map";

        const data = {
            user: this.user,
            vault: this.vault,
            api_key: this.apiKey,
            highlight_id: highlightId
        };

        // Send the POST request
        return fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        })
        .then(response => response.json());
    }
}
