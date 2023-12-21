# VectorVault

VectorVault API - JavaScript Client: Streamline your front-end development with the powerful combination of OpenAI's API and VectorVault's Cloud Vector Database. This JavaScript client provides seamless integration for building advanced RAG (Retrieve and Generate) applications. Whether you're working with JavaScript, HTML, or other web technologies, our API simplifies the process of fetching RAG responses through API POST requests. This package is the key to unlocking quick and efficient development for AI-powered web applications, ensuring a secure and robust connection to the VectorVault ecosystem. Start crafting exceptional RAG apps with minimal effort and maximum efficiency.

## Installation

Install VectorVault via npm:

```bash
npm install vectorvault --save
```
# Usage
To use VectorVault, you need to import it and instantiate it with your user details and API keys:

```javascript
import VectorVault from 'vectorvault';

const user = 'your_email@example.com';
const vault = 'your_vault_name';
const api = 'your_vectorvault_api_key';
const openai_key = 'your_openai_api_key';

const vectorVault = new VectorVault(user, vault, api, openai_key);
```
# Basic Operations
Here are some of the basic operations you can perform:

```javascript
// Get a chat response
vectorVault.getChat({ text: 'Your query here' })
  .then(response => console.log(response))
  .catch(error => console.error(error));

// Manage items in the vault
vectorVault.getItems([1])
  .then(items => console.log(items))
  .catch(error => console.error(error));

// Add new items to the cloud
vectorVault.addCloud({ text: 'Your text data here' })
  .then(response => console.log(response))
  .catch(error => console.error(error));
```

## Streaming Chat Responses

The `getChatStream` function allows you to stream data from the VectorVault API. It requires two arguments: `params`, which is an object containing the parameters for your request, and `callback`, which is a function that will be called with each piece of data received from the stream.

Here is how you can use `getChatStream`:

```javascript
// Define your callback function
function handleStreamedData(data) {
    // Process the streamed data here 
    console.log(data);
}

// Set up the parameters for your request
const streamParams = {
    text: "Your query here",
    // ...other parameters as needed
};

// Start streaming data
vectorVault.getChatStream(streamParams, handleStreamedData)
    .then(() => console.log("Streaming completed."))
    .catch(error => console.error("Streaming error:", error));
```

The params object can include any of the following properties:

`text:` The input text for the chat.
<br>
`history:` The chat history, if applicable.
<br>
`summary:` A boolean indicating if the response should be a summary.
<br>
`get_context:` A boolean to indicate if you want to receive context information.
<br>
`n_context:` The number of context turns you want to receive.
<br>
`return_context:` A boolean to include the context in the response.
<br>
`smart_history_search:` A boolean to enable smart history searching.
<br>
`model:` The model you want to use, e.g., "gpt-3.5-turbo".
<br>
`include_context_meta:` A boolean to include metadata about the context.
<br>
`metatag, metatag_prefixes, metatag_suffixes:` Arrays for advanced context tagging.
<br>
`custom_prompt:` A custom prompt to be used instead of the default.
<br>
`temperature:` The creativity temperature.
<br>
`timeout:` The timeout for the model response wait time.
<br>
<br>
Make sure to replace "Your query here" with the actual text you want to send to the API.

Please note that getChatStream is an asynchronous function and should be handled with async/await or .then().catch() for proper error handling.
If you don't already have a VectorVault API key, go get one at [vectorvault.io](https://vectorvault.io)