# VectorVault

VectorVault API - JavaScript Client: Streamline your front-end development with the powerful capabilities of VectorVault's Cloud Vector Database. This JavaScript client provides seamless integration for building advanced RAG (Retrieve and Generate) applications. Whether you're working with JavaScript, HTML, or other web technologies, our API simplifies the process of fetching RAG responses through API POST requests. This package is the key to unlocking quick and efficient development for AI-powered web applications, ensuring a secure and robust connection to the VectorVault ecosystem. Start crafting exceptional RAG apps with minimal effort and maximum efficiency.


## Installation

### 1. Via NPM (for React/Node.js/bundled projects)

```bash
npm install vectorvault --save
```

### 2. Via CDN (for HTML)

Add the following script tag to your HTML:

```html
<script src="https://cdn.jsdelivr.net/gh/John-Rood/VectorVault-js@main/dist/vectorvault.bundle.js"></script>
```

## Usage

To use VectorVault, you need to import it, instantiate it, and log in with your user credentials:

```javascript
import VectorVault from 'vectorvault';

// Create a VectorVault instance 
const vectorVault = new VectorVault(); 

// Log in with your email and password
await vectorVault.login('your_email@example.com', 'your_password');
// OR email and API key
await vectorVault.loginAPI('your_email@example.com', 'your_api_key');
```

## Basic Operations

After logging in, you can perform various operations with your vaults.

### Get a Chat Response

```javascript
const params = {
  vault: 'your_vault_name',
  text: 'Your query here',
  // ...other optional parameters
};

vectorVault
  .getChat(params)
  .then(response => console.log(response))
  .catch(error => console.error(error));
```

### Manage Items in the Vault

#### Get Items

```javascript
const vault = 'your_vault_name';
const itemIds = [1, 2, 3]; // IDs of the items you want to retrieve

vectorVault
  .getItems(vault, itemIds)
  .then(items => console.log(items))
  .catch(error => console.error(error));
```

#### Add New Items to the Cloud

```javascript
const params = {
  vault: 'your_vault_name',
  text: 'Your text data here',
  // ...other optional parameters
};

vectorVault
  .addCloud(params)
  .then(response => console.log(response))
  .catch(error => console.error(error));
```

## Streaming Chat Responses

The `getChatStream` function allows you to stream data from the VectorVault API. It requires two arguments: `params`, which is an object containing the parameters for your request, and `callback`, which is a function that will be called with each piece of data received from the stream.

Here's how you can use `getChatStream`:

```javascript
// Define your callback function
function handleStreamedData(data) {
  // Process the streamed data here
  console.log(data);
}

// Set up the parameters for your request
const streamParams = {
  vault: 'your_vault_name',
  text: 'Your query here',
  // ...other optional parameters
};

// Start streaming data
vectorVault
  .getChatStream(streamParams, handleStreamedData)
  .then(() => console.log('Streaming completed.'))
  .catch(error => console.error('Streaming error:', error));
```
### Parameters for `getChatStream`

The `params` object can include any of the following properties:

- `vault`: The name of your vault.
- `text`: The input text for the chat.
- `history`: The chat history, if applicable.
- `summary`: A boolean indicating if the response should be a summary.
- `get_context`: A boolean to indicate if you want to receive context information.
- `n_context`: The number of context turns you want to receive.
- `return_context`: A boolean to include the context in the response.
- `smart_history_search`: A boolean to enable smart history searching.
- `model`: The model you want to use, e.g., `"gpt-3.5-turbo"`.
- `include_context_meta`: A boolean to include metadata about the context.
- `metatag`, `metatag_prefixes`, `metatag_suffixes`: Arrays for advanced context tagging.
- `custom_prompt`: A custom prompt to be used instead of the default.
- `temperature`: The creativity temperature.
- `timeout`: The timeout for the model response wait time.

Make sure to replace `"Your query here"` with the actual text you want to send to the API.

**Note**: `getChatStream` is an asynchronous function and should be handled with `async/await` or `.then().catch()` for proper error handling.

## Additional Operations

### Authentication

- **Login**

  ```javascript
  await vectorVault.login('your_email@example.com', 'your_password');
  // OR 
  await vectorVault.loginAPI('your_email@example.com', 'your_api_key');
  ```


- **Logout** 

  ```javascript
  vectorVault.logout();
  ```

### Vault Management

- **Get Vaults**

  ```javascript
  vectorVault
    .getVaults()
    .then(vaults => console.log(vaults))
    .catch(error => console.error(error));
  ```

- **Delete Vault**

  ```javascript
  const vault = 'your_vault_name';
  vectorVault
    .deleteVault(vault)
    .then(response => console.log(response))
    .catch(error => console.error(error));
  ```

### Data Management

- **Edit an Item**

  ```javascript
  const vault = 'your_vault_name';
  const itemId = 123;
  const newText = 'Updated text content';

  vectorVault
    .editItem(vault, itemId, newText)
    .then(response => console.log(response))
    .catch(error => console.error(error));
  ```

- **Delete Items**

  ```javascript
  const vault = 'your_vault_name';
  const itemIds = [1, 2, 3];

  vectorVault
    .deleteItems(vault, itemIds)
    .then(response => console.log(response))
    .catch(error => console.error(error));
  ```

- **Get Total Items**

  ```javascript
  const vault = 'your_vault_name';

  vectorVault
    .getTotalItems(vault)
    .then(total => console.log(`Total items: ${total}`))
    .catch(error => console.error(error));
  ```

### Similarity and Distance

- **Get Distance Between Two Items**

  ```javascript
  const vault = 'your_vault_name';
  const id1 = 1;
  const id2 = 2;

  vectorVault
    .getDistance(vault, id1, id2)
    .then(distance => console.log(`Distance: ${distance}`))
    .catch(error => console.error(error));
  ```

- **Get Similar Items**

  ```javascript
  const params = {
    vault: 'your_vault_name',
    text: 'Sample text to find similarities',
    num_items: 4,
    include_distances: true,
    // ...other optional parameters
  };

  vectorVault
    .getSimilar(params)
    .then(similarItems => console.log(similarItems))
    .catch(error => console.error(error));
  ```

### Account and Vault Data

- **Get Account Data**

  ```javascript
  vectorVault
    .getAccountData()
    .then(data => console.log(data))
    .catch(error => console.error(error));
  ```

- **Download Vault Data to JSON**

  ```javascript
  const params = {
    vault: 'your_vault_name',
    return_meta: true,
  };

  vectorVault
    .downloadToJson(params)
    .then(jsonData => console.log(jsonData))
    .catch(error => console.error(error));
  ```

- **Upload Data from JSON**

  ```javascript
  const vault = 'your_vault_name';
  const jsonData = {/* Your JSON data */};

  vectorVault
    .uploadFromJson(vault, jsonData)
    .then(response => console.log(response))
    .catch(error => console.error(error));
  ```

### Customization

- **Save Personality Message**

  ```javascript
  const vault = 'your_vault_name';
  const personalityMessage = 'Your personality message here';

  vectorVault
    .savePersonalityMessage(vault, personalityMessage)
    .then(response => console.log(response))
    .catch(error => console.error(error));
  ```

- **Fetch Personality Message**

  ```javascript
  const vault = 'your_vault_name';

  vectorVault
    .fetchPersonalityMessage(vault)
    .then(message => console.log(message))
    .catch(error => console.error(error));
  ```

- **Save Custom Prompt**

  ```javascript
  const vault = 'your_vault_name';
  const customPrompt = 'Your custom prompt here';

  vectorVault
    .saveCustomPrompt(vault, customPrompt)
    .then(response => console.log(response))
    .catch(error => console.error(error));
  ```

- **Fetch Custom Prompt**

  ```javascript
  const vault = 'your_vault_name';

  vectorVault
    .fetchCustomPrompt(vault)
    .then(prompt => console.log(prompt))
    .catch(error => console.error(error));
  ```

### 3D Map Data

- **Fetch 3D Map Data**

  ```javascript
  const vault = 'your_vault_name';
  const highlightId = null; // or specify an item ID to highlight

  vectorVault
    .fetch3DMap(vault, highlightId)
    .then(mapData => console.log(mapData))
    .catch(error => console.error(error));
  ```

### Flow Execution with Streaming

- **Run Flow with Streaming Response**

  ```javascript
  const flowName = 'your_flow_name';
  const message = 'Your message here';
  const history = ''; // optional

  const callbacks = {
    onLog: logData => {
      console.log('Log:', logData);
    },
    onMessage: messageData => {
      console.log('Message:', messageData);
    },
  };

  vectorVault
    .runFlowStream(flowName, message, history, callbacks)
    .then(result => {
      console.log('Flow completed:', result);
    })
    .catch(error => {
      console.error('Flow error:', error);
    });
  ```

## Error Handling

Most methods return promises and should be handled with `.then().catch()` or `async/await` syntax. Proper error handling ensures your application can handle exceptions gracefully.

## Notes

- Replace placeholder values (like `'your_email@example.com'`, `'your_password'`, `'your_vault_name'`, etc.) with your actual account and vault information.
- If you don't already have a VectorVault account, sign up at [vectorvault.io](https://vectorvault.io).

## Conclusion

With the VectorVault JavaScript client, you can easily integrate advanced vector-based operations into your web applications. Whether you're building AI Agents, recommendation systems, or any AI-powered application, VectorVault provides the tools you need for efficient and secure development.
