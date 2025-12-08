# VectorVault JavaScript Client

VectorVault API - JavaScript Client: Streamline your development with the powerful capabilities of VectorVault's Cloud Vector Database. This JavaScript client provides seamless integration for building advanced RAG (Retrieve and Generate) applications. Whether you're working with JavaScript, HTML, or other web technologies, our API simplifies the process of fetching RAG responses through API POST requests. This package is the key to unlocking quick and efficient development for AI-powered applications, ensuring a secure and robust connection to the VectorVault ecosystem.

---

## Table of Contents

1. [Installation](#installation)
2. [Documentation](#documentation)
3. [Quick Start](#quick-start)
4. [Authentication](#authentication)
5. [Chat & RAG Methods](#chat--rag-methods)
6. [Vault Management](#vault-management)
7. [Data Management](#data-management)
8. [Search & Similarity](#search--similarity)
9. [Customization](#customization)
10. [VectorFlow - AI Agent Workflows](#vectorflow---ai-agent-workflows)
    - [What is VectorFlow?](#what-is-vectorflow)
    - [Core Capabilities](#core-capabilities)
    - [Building Flows](#building-flows)
    - [Flow Nodes Reference](#flow-nodes-reference)
    - [JavaScript API](#javascript-api)
    - [Platform Architecture](#platform-architecture)
11. [File Uploads](#file-uploads)
12. [Utility Methods](#utility-methods)
13. [Type Definitions](#type-definitions)
14. [Error Handling](#error-handling)
15. [Complete Example](#complete-example)
16. [Additional Resources](#additional-resources)

---

## Installation

### 1. Via NPM (for React/Node.js/bundled projects)

```bash
npm install vectorvault
```

### 2. Via CDN (for HTML)

```html
<script src="https://cdn.jsdelivr.net/gh/John-Rood/VectorVault-js@main/dist/vectorvault.bundle.js"></script>
```

---

## 📚 Documentation

**📑 [Documentation Index](DOCUMENTATION_INDEX.md)** - Complete guide to all documentation

**Quick Access:**
- **[Quick Reference](QUICK_REFERENCE.md)** - Fast lookup for common operations
- **[API Documentation](API_DOCUMENTATION.md)** - Complete API reference
- **[VectorFlow Logging Reference](vectorflow_logging.md)** - Flow execution logging details

---

## Quick Start

```javascript
import VectorVault from 'vectorvault';

// Create a VectorVault instance 
const vv = new VectorVault(); 

// Login with password
await vv.login('your_email@example.com', 'your_password');

// OR initialize a deployment (token-based)
await vv.initializeDeployment('your_email@example.com', 'your_deployment_id');

// Get a chat response
const response = await vv.getChat({
  vault: 'your_vault_name',
  text: 'Your query here',
  get_context: true,
  n_context: 3,
  model: 'gpt-4o'
});

console.log(response);
```

---

## Authentication

### Constructor

```javascript
const vv = new VectorVault(embeddingsModel);
```

Creates a new instance of the VectorVault client.

**Parameters:**
- `embeddingsModel` (optional): String specifying the embeddings model to use. Defaults to `null`.

**Properties:**
- `embeddingsModel`: The embeddings model being used
- `accessToken`: Current JWT access token
- `refreshToken`: JWT refresh token
- `tokenExpiresAt`: Token expiration timestamp
- `baseUrl`: API base URL (`https://api.vectorvault.io`)
- `vectorUrl`: Vector operations URL (`https://vectors.vectorvault.io`)
- `deploymentId`: Current deployment ID (if using deployment auth)

---

### login()

```javascript
await vv.login(email, password);
```

Authenticates a user with email and password, obtaining JWT tokens.

**Parameters:**
- `email`: User's email address
- `password`: User's password

**Example:**
```javascript
await vv.login('user@example.com', 'password123');
```

---

### initializeDeployment()

```javascript
await vv.initializeDeployment(email, deploymentId);
```

Initializes a deployment-based authentication session (token-based authentication alternative to password login).

**Parameters:**
- `email`: User's email address
- `deploymentId`: Deployment identifier

**Example:**
```javascript
await vv.initializeDeployment('user@example.com', 'deploy_abc123');
```

---

### Other Authentication Methods

**refreshAccessToken(maxRetries)**
```javascript
const refreshed = await vv.refreshAccessToken();
```
Refreshes the access token using the refresh token. Called automatically when needed.

**getAccessToken()**
```javascript
const token = vv.getAccessToken();
```
Returns the current access token.

**logout()**
```javascript
vv.logout();
```
Clears all authentication tokens and logs out the user.

---

## Chat & RAG Methods

### getChat()

```javascript
const response = await vv.getChat(params);
```

Gets a chat response with optional context retrieval from vault.

**Parameters:**

| Parameter | Type | Default | Required | Description |
|-----------|------|---------|----------|-------------|
| `vault` | `string` | `''` | No | Vault name to query |
| `text` | `string` | `''` | No | User's input message |
| `embeddings_model` | `string` | instance default | No | Embeddings model to use |
| `history` | `string \| null` | `null` | No | Conversation history |
| `summary` | `boolean` | `false` | No | Whether to summarize response |
| `get_context` | `boolean` | `false` | No | Whether to retrieve context from vault |
| `n_context` | `number` | `4` | No | Number of context items to retrieve |
| `return_context` | `boolean` | `false` | No | Whether to include context in response |
| `smart_history_search` | `boolean` | `false` | No | Enable intelligent history search |
| `model` | `string` | `'gpt-4o'` | No | LLM model to use |
| `include_context_meta` | `boolean` | `false` | No | Include metadata with context |
| `custom_prompt` | `string \| boolean` | `false` | No | Custom system prompt |
| `temperature` | `number` | `0` | No | Model temperature (0-2) |
| `timeout` | `number` | `45` | No | Request timeout in seconds |

**Example:**
```javascript
const response = await vv.getChat({
  vault: 'my_knowledge_base',
  text: 'What is machine learning?',
  get_context: true,
  n_context: 3,
  return_context: true,
  model: 'gpt-4o',
  temperature: 0.7
});

console.log(response);
```

---

### getChatStream()

```javascript
await vv.getChatStream(params, callback);
```

Gets a streaming chat response, calling the callback for each chunk of data.

**Parameters:**
- Same as `getChat()`, plus:
- `callback`: Function called with each streamed text chunk

**Additional parameters:**
- `metatag`: `string[]` - Array of metatags for filtering
- `metatag_prefixes`: `string[]` - Array of metatag prefixes
- `metatag_suffixes`: `string[]` - Array of metatag suffixes

**Example:**
```javascript
let fullResponse = '';

await vv.getChatStream(
  {
    vault: 'my_vault',
    text: 'Tell me about quantum computing',
    get_context: true,
    model: 'gpt-4o'
  },
  (chunk) => {
    fullResponse += chunk;
    process.stdout.write(chunk); // Stream to console
  }
);

console.log('\nComplete response:', fullResponse);
```

---

## Vault Management

### getVaults()

```javascript
const vaults = await vv.getVaults();
```

Retrieves list of all vaults for the authenticated user.

**Returns:** Array of vault names

**Example:**
```javascript
const vaults = await vv.getVaults();
console.log('Available vaults:', vaults);
// Output: ['vault1', 'vault2', 'knowledge_base']
```

---

### createVault()

```javascript
await vv.createVault(vault);
```

Creates a new vault.

**Parameters:**
- `vault`: Name of the vault to create

**Example:**
  ```javascript
await vv.createVault('my_new_vault');
  ```

---

### deleteVault()

  ```javascript
await vv.deleteVault(vault);
  ```

Deletes an entire vault and all its contents. **This action is irreversible.**

**Parameters:**
- `vault`: Name of the vault to delete

**Example:**
  ```javascript
await vv.deleteVault('old_vault');
  ```

---

### getAccountData()

  ```javascript
const accountData = await vv.getAccountData();
```

Retrieves account information including vault statistics.

**Example:**
  ```javascript
const accountData = await vv.getAccountData();
console.log(accountData);
```

---

## Data Management

### addCloud()

  ```javascript
await vv.addCloud(params);
```

Adds text data to a vault with optional processing.

**Parameters:**

| Parameter | Type | Default | Required | Description |
|-----------|------|---------|----------|-------------|
| `vault` | `string` | `''` | Yes | Target vault name |
| `text` | `string` | `''` | Yes | Text content to add |
| `embeddings_model` | `string` | instance default | No | Embeddings model |
| `meta` | `object \| null` | `null` | No | Metadata to attach |
| `name` | `string \| null` | `null` | No | Name/identifier for the item |
| `split` | `boolean` | `false` | No | Whether to split into chunks |
| `split_size` | `number` | `1000` | No | Chunk size if splitting |
| `gen_sum` | `boolean` | `false` | No | Generate summary |

**Example:**
```javascript
await vv.addCloud({
  vault: 'knowledge_base',
  text: 'This is important information about our product.',
  meta: { source: 'documentation', category: 'product' },
  name: 'product_info_v1',
  split: true,
  split_size: 500
});
```

---

### addSite()

  ```javascript
await vv.addSite(params);
```

Scrapes and adds content from a website URL to a vault.

**Parameters:**
- `vault`: Target vault name (required)
- `site`: URL of website to scrape (required)
- `embeddings_model`: Embeddings model (optional)

**Example:**
```javascript
await vv.addSite({
  vault: 'web_content',
  site: 'https://example.com/blog/article'
});
```

---

### getItems()

  ```javascript
const items = await vv.getItems(vault, itemIds);
```

Retrieves specific items from a vault by their IDs.

**Parameters:**
- `vault`: Vault name
- `itemIds`: Array of item IDs to retrieve

**Example:**
```javascript
const items = await vv.getItems('my_vault', [1, 5, 10, 15]);
console.log(items);
```

---

### editItem()

```javascript
await vv.editItem(vault, itemId, newText);
```

Edits the text content of an existing item in a vault.

**Parameters:**
- `vault`: Vault name
- `itemId`: ID of the item to edit
- `newText`: New text content

**Example:**
```javascript
await vv.editItem('my_vault', 42, 'Updated text content for this item');
```

---

### deleteItems()

```javascript
await vv.deleteItems(vault, itemIds);
```

Deletes specific items from a vault.

**Parameters:**
- `vault`: Vault name
- `itemIds`: Array of item IDs to delete

**Example:**
```javascript
// Delete single item
await vv.deleteItems('my_vault', [123]);

// Delete multiple items
await vv.deleteItems('my_vault', [1, 2, 3, 4, 5]);
```

---

### getTotalItems()

```javascript
const result = await vv.getTotalItems(vault);
```

Gets the total number of items in a vault.

**Parameters:**
- `vault`: Vault name

**Example:**
  ```javascript
const result = await vv.getTotalItems('my_vault');
console.log(`Total items: ${result.total}`);
```

---

### uploadFromJson()

  ```javascript
await vv.uploadFromJson(vault, jsonData);
```

Uploads data to a vault from a JSON object.

**Parameters:**
- `vault`: Target vault name
- `jsonData`: JSON object containing data to upload

**Example:**
```javascript
const data = {
  items: [
    { text: 'Item 1', meta: { id: 1 } },
    { text: 'Item 2', meta: { id: 2 } }
  ]
};

await vv.uploadFromJson('my_vault', data);
```

---

### downloadToJson()

  ```javascript
const data = await vv.downloadToJson(params);
```

Downloads vault data as JSON.

**Parameters:**
- `vault`: Vault name to download (required)
- `return_meta`: Include metadata in export (optional, default: false)

**Example:**
```javascript
const data = await vv.downloadToJson({
  vault: 'my_vault',
  return_meta: true
});

console.log(data);
```

---

## Search & Similarity

### getSimilar()

  ```javascript
const results = await vv.getSimilar(params);
```

Finds items semantically similar to the input text. Supports both single-vault and cross-vault search.

**Parameters:**

| Parameter | Type | Default | Required | Description |
|-----------|------|---------|----------|-------------|
| `text` | `string` | `''` | Yes | Text to find similarities for |
| `vault` | `string` | `''` | No* | Single vault to search (legacy) |
| `vaults` | `string \| string[] \| object` | `null` | No* | Cross-vault search configuration |
| `embeddings_model` | `string` | instance default | No | Embeddings model |
| `num_items` | `number` | `4` | No | Maximum number of results |
| `include_distances` | `boolean` | `false` | No | Include similarity distances |

*Either `vault` or `vaults` should be provided

**Cross-Vault Search (`vaults` parameter):**

1. **Single vault (string):**
   ```javascript
   vaults: 'my_vault'
   ```

2. **Multiple vaults (array):**
   ```javascript
   vaults: ['vault1', 'vault2', 'vault3']
   // Returns top num_items across all vaults, globally sorted
   ```

3. **Multiple vaults with minimums (object):**
  ```javascript
   vaults: { vault1: 3, vault2: 1, vault3: 2 }
   // Guarantees at least N results from each vault
   // Total results may exceed num_items to satisfy minimums
   ```

**Examples:**

```javascript
// Single vault search
const results1 = await vv.getSimilar({
  vault: 'my_vault',
  text: 'machine learning algorithms',
  num_items: 5,
  include_distances: true
});

// Cross-vault search (merged results)
const results2 = await vv.getSimilar({
  vaults: ['vault1', 'vault2'],
  text: 'customer feedback',
  num_items: 10
});

// Cross-vault with minimums per vault
const results3 = await vv.getSimilar({
  vaults: {
    technical_docs: 3,
    user_guides: 2,
    faqs: 1
  },
  text: 'installation process',
  num_items: 10,
  include_distances: true
});

console.log(results3);
```

---

### getDistance()

  ```javascript
const result = await vv.getDistance(vault, id1, id2);
```

Calculates the semantic distance between two items in a vault.

**Parameters:**
- `vault`: Vault name
- `id1`: First item ID
- `id2`: Second item ID

**Example:**
```javascript
const result = await vv.getDistance('my_vault', 10, 25);
console.log(`Distance: ${result.distance}`);
```

---

## Customization

### savePersonalityMessage()

  ```javascript
await vv.savePersonalityMessage(vault, personalityMessage);
```

Sets a personality/system message for a vault that influences chat responses.

**Parameters:**
- `vault`: Vault name
- `personalityMessage`: Personality instruction text

**Example:**
```javascript
await vv.savePersonalityMessage(
  'customer_support',
  'You are a helpful and empathetic customer support agent. Always be polite and professional.'
);
```

---

### fetchPersonalityMessage()

  ```javascript
const result = await vv.fetchPersonalityMessage(vault);
```

Retrieves the personality message for a vault.

**Parameters:**
- `vault`: Vault name

**Example:**
```javascript
const result = await vv.fetchPersonalityMessage('customer_support');
console.log(result.personality_message);
```

---

### saveCustomPrompt()

```javascript
await vv.saveCustomPrompt(vault, customPrompt, context);
```

Saves a custom prompt template for a vault.

**Parameters:**
- `vault`: Vault name
- `customPrompt`: Custom prompt template
- `context` (optional): Whether prompt includes context. Defaults to `true`.

**Example:**
```javascript
await vv.saveCustomPrompt(
  'my_vault',
  'Answer based on the following context: {context}\n\nQuestion: {question}',
  true
);
```

---

### fetchCustomPrompt()

```javascript
const result = await vv.fetchCustomPrompt(vault, context);
```

Retrieves the custom prompt for a vault.

**Parameters:**
- `vault`: Vault name
- `context` (optional): Defaults to `true`

**Example:**
```javascript
const result = await vv.fetchCustomPrompt('my_vault');
console.log(result.custom_prompt);
```

---

## VectorFlow - AI Agent Workflows

### What is VectorFlow?

**VectorFlow** is a platform for building, deploying, and operating autonomous AI agents. While many tools focus on simple conversational AI, VectorFlow is engineered to solve the more complex challenges of running agent systems reliably in production.

#### The Persistent Agentic Runtime (PAR)

VectorFlow operates on a **Persistent Agentic Runtime (PAR)** - an execution layer designed for systems that maintain continuous state and operate with temporal autonomy. This enables agents to:

- **Remember context** across multiple, asynchronous interactions
- **Operate independently** without constant human supervision
- **Handle complex, multi-step processes** that span hours or days
- **Maintain state** while scaling in a serverless environment
- **Provide transparent, auditable logs** of their decision-making process

This is not a toolkit for building better chatbots. It is an execution layer designed for systems that need to work when no one is watching.

---

### Core Capabilities

#### Visual Flow Builder
- **Design flows visually** at [app.vectorvault.io/vector-flow](https://app.vectorvault.io/vector-flow)
- **Drag-and-drop interface** for building complex logic
- **Real-time testing** with integrated logger
- **Instant deployment** - changes are live immediately

#### Multiple AI Models
- **OpenAI**: GPT-4, GPT-4o, GPT-3.5-turbo
- **Anthropic**: Claude 3 family (Haiku, Sonnet, Opus)
- **xAI**: Grok models
- **Google**: Gemini and PaLM models
- **Custom**: Support for fine-tuned models

#### Advanced Reasoning Patterns
- **Chain of Thought (CoT)**: Sequential reasoning steps
- **Tree of Thought (ToT)**: Parallel exploration of reasoning paths
- **Graph of Thought (GoT)**: Complex interconnected reasoning networks

#### Integration & Extensibility
- **API Integration**: Call external APIs within any flow
- **Python Execution**: Run Python scripts in secure, sandboxed containers
- **Public Demo Pages**: Deploy shareable web demos directly from the UI
- **Multi-Platform**: JavaScript, Python, Zapier, webhooks

#### Variable System

Flows use a powerful variable system for dynamic behavior:

- **Bracket Notation**: Use `{variable_name}` syntax in any text field
- **Dynamic Assignment**: Set variables with node outputs or custom code
- **Runtime Parameters**: Pass variables to flows at execution time
- **Environment Access**: Variables available as environment variables in Act nodes
- **Global Context**: All nodes access current message and conversation history

**Example:**
```javascript
// Pass runtime variables to customize flow behavior
const result = await vv.runFlow(
  'customer_support',
  'I need help',
  '',
  'user_123',
  null,
  null,
  { 
    user_plan: 'premium',
    user_name: 'John',
    support_tier: 'priority'
  }
);
// Inside the flow, use {user_plan}, {user_name}, {support_tier} in any text field
```

---

### Building Flows

#### Visual Flow Builder Workflow

Build flows at **[app.vectorvault.io/vector-flow](https://app.vectorvault.io/vector-flow)**:

1. **Drag and Drop**: Add nodes to your canvas
2. **Connect Logic**: Draw connections between nodes to define flow
3. **Configure Nodes**: Set parameters, prompts, and variables
4. **Test in Real-time**: Use the integrated logger to validate behavior
5. **Deploy Instantly**: Changes are live immediately

---

### Flow Nodes Reference

#### Core Logic Nodes

**Start**
- **Purpose**: The designated starting point for every flow
- **Inputs**: 0 | **Outputs**: 1

**Recognize**
- **Purpose**: AI-powered decision node. Ask a yes/no question about the user's message (e.g., "Is the user asking for a refund?") and branch based on the AI's answer
- **Inputs**: 1 | **Outputs**: 2 (Yes, No)
- **Use Case**: Route conversations based on intent detection

**Multiple Choice (list_match)**
- **Purpose**: AI-powered router. Intelligently categorizes user messages into one of several predefined paths (e.g., "Sales Inquiry," "Technical Support," "Billing Question")
- **Inputs**: 1 | **Outputs**: Dynamic (one for each option)
- **Use Case**: Multi-way branching based on message classification

**If/Then**
- **Purpose**: Traditional programming logic. Check variable values and branch accordingly (e.g., `if {user_plan} == "premium"`)
- **Inputs**: 1 | **Outputs**: 2 (True, False)
- **Use Case**: Create personalized experiences based on state

---

#### Response Nodes

**Respond**
- **Purpose**: Send messages to users. Generate dynamic AI responses using vault context or provide static messages
- **Inputs**: 1 | **Outputs**: 1
- **Use Case**: Final step in most conversational branches

**Generate**
- **Purpose**: AI's creative engine for internal tasks. Creates text saved to a variable instead of sending to user
- **Inputs**: 1 | **Outputs**: 1
- **Use Case**: Summaries, subject lines, search queries, data preparation

**Number**
- **Purpose**: Extract or generate numeric values. AI pulls numbers from text or generates scores
- **Inputs**: 1 | **Outputs**: 1
- **Use Case**: Extract quantities, generate satisfaction scores, calculations

---

#### Data Processing Nodes

**Capture**
- **Purpose**: Turn conversation into structured data. Extract specific information (name, email, order number) and save to variables
- **Inputs**: 1 | **Outputs**: 1
- **Use Case**: Populate CRMs, call APIs, personalize conversations

**Act**
- **Purpose**: Gateway to the outside world. Run Python code in secure sandbox. Call third-party APIs, perform calculations, interact with systems
- **Inputs**: 1 | **Outputs**: 1
- **Use Case**: API calls, complex logic, external integrations
- **Security**: Restricted to Python's built-in modules

**Variable**
- **Purpose**: Set or modify variables with fixed values. Define defaults, store counters, set flags
- **Inputs**: 1 | **Outputs**: 1
- **Use Case**: State management, configuration, flow control

---

#### External Integration Nodes

**Email**
- **Purpose**: Send emails via SMTP. All fields (To, Subject, Body) can use variables
- **Inputs**: 1 | **Outputs**: 1
- **Use Case**: Send transcripts, notifications, confirmations

**Google Search**
- **Purpose**: Real-time web search. Perform searches and save results to variables
- **Inputs**: 1 | **Outputs**: 1
- **Use Case**: Answer questions about current events, up-to-date information

**Download URL (website)**
- **Purpose**: Let agent "read" webpages. Pull content from any URL and save to variable
- **Inputs**: 1 | **Outputs**: 1
- **Use Case**: Ingest articles, documentation, simple APIs

**Run Flow**
- **Purpose**: Build complex agents from smaller, reusable parts. Call another flow as a "sub-routine"
- **Inputs**: 1 | **Outputs**: 1
- **Use Case**: Modular architecture, specialized handlers

---

#### Storage & Data Nodes

**Storage**
- **Purpose**: Agent's long-term memory. Save and retrieve from persistent key-value store
- **Inputs**: 1 | **Outputs**: 1
- **Use Case**: Track preferences, store history across sessions, manage state

**Add To Vault**
- **Purpose**: Make agent smarter over time. Add text to vector database for future retrieval
- **Inputs**: 1 | **Outputs**: 1
- **Use Case**: Learn from interactions, build knowledge base

---

#### Control Flow Nodes

**Parallel**
- **Purpose**: Run multiple branches simultaneously. Flow continues after all tasks complete
- **Inputs**: 1 | **Outputs**: 2+
- **Use Case**: Concurrent API calls, searches, and generation

**Wait**
- **Purpose**: Pause flow for specific time (seconds to days)
- **Inputs**: 1 | **Outputs**: 1
- **Use Case**: Natural delays, scheduled follow-ups

**No Response**
- **Purpose**: Clean exit without sending message to user
- **Inputs**: 1 | **Outputs**: 0
- **Use Case**: Behind-the-scenes work, external system handoff

---

### JavaScript API

#### runFlow()

Executes a flow and returns the complete response when finished.

```javascript
const result = await vv.runFlow(
  flowName,              // string - Flow identifier
  message,               // string - User message
  history,               // string - Chat history (optional)
  conversation_user_id,  // string - User ID (optional)
  session_id,            // string - Session identifier (optional)
  invoke_method,         // string - Label for logs (optional)
  internal_vars,         // object - Runtime variables (optional)
  callbacks              // object - Callback functions (optional)
);
```

**Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `flowName` | `string` | - | Flow identifier |
| `message` | `string` | - | User message/input |
| `history` | `string` | `''` | Conversation history |
| `conversation_user_id` | `string \| null` | `null` | User ID for multi-user apps |
| `session_id` | `string \| null` | `null` | Session/thread identifier |
| `invoke_method` | `string \| null` | `null` | Label written to logs |
| `internal_vars` | `object \| null` | `null` | Override flow variables |
| `callbacks` | `FlowCallbacks` | `{}` | Callback functions |

**Callbacks Object:**
```javascript
{
  onMessage?: (message: string) => void;
  onLog?: (log: any) => void;
  onError?: (error: any) => void;
}
```

**Returns:** `FlowResult`:
```javascript
{
  response: string;
  logs: any[];
}
```

**Example:**
```javascript
const result = await vv.runFlow(
  'customer_onboarding',
  'I need help setting up my account',
  '',
  'user_123',
  'session_abc',
  'web_chat',
  { plan_type: 'premium' },
  {
    onMessage: (msg) => console.log('Response:', msg),
    onError: (err) => console.error('Error:', err)
  }
);

console.log('Final response:', result.response);
console.log('Logs:', result.logs);
```

---

#### runFlowStream()

Executes a flow with streaming response, calling callbacks as data arrives.

```javascript
const result = await vv.runFlowStream(
  flowName,
  message,
  history,
  conversation_user_id,
  session_id,
  invoke_method,
  internal_vars,
  callbacks
);
```

**Parameters:** Same as `runFlow()`

**Example:**
```javascript
let fullResponse = '';

const result = await vv.runFlowStream(
  'tech_support',
  'How do I reset my password?',
  '',
  null,
  null,
  'api',
  { user_tier: 'enterprise' },
  {
    onMessage: (chunk) => {
      fullResponse += chunk;
      process.stdout.write(chunk); // Real-time streaming
    },
    onLog: (log) => {
      console.log('[LOG]', log);
    },
    onError: (error) => {
      console.error('[ERROR]', error);
    }
  }
);

console.log('\n\nFinal result:', result);
```

---

### Platform Architecture

#### Deployment Options

**Public Demo Pages**
- Deploy shareable web interfaces directly from the builder
- Ideal for stakeholder demonstrations and proof-of-concept validation
- Instant deployment with automatic scaling

**API Integration**
- RESTful API access to all flows
- Webhook support for triggering flows from external systems
- Built-in rate limiting and authentication

**Platform Integration**
- **JavaScript/React**: Full-featured SDK (this package)
- **Python**: Native Python client for backend services
- **Zapier**: No-code integration with thousands of applications
- **Custom Webhooks**: Generic HTTP endpoint for all integrations

---

#### Infrastructure & Reliability

**Serverless Architecture**
- Hosted on Google Cloud Platform (GCP)
- Automatic scaling to handle any load
- No server management required

**Global Distribution**
- Low-latency execution from data centers worldwide
- Intelligent request routing
- Geographic redundancy

**High Availability**
- Enterprise-grade uptime and reliability
- Automatic failover and recovery
- Load balancing for optimal performance

**Secure Execution**
- Code runs in isolated containers
- Sandboxed environments with controlled access
- No file system access in Act nodes
- Environment-based credential management

---

#### Observability & Monitoring

**Real-time Logging**
- Live view of every step of execution
- See inputs, outputs, and decisions as they happen
- Debug flows in real-time

**Historical Tracking**
- Complete, permanent audit trail of all flow runs
- Track changes and performance over time
- Compliance and accountability

**Performance Metrics**
- Detailed data on response times
- Success rates and failure patterns
- Identify bottlenecks and optimize

**Error Handling**
- Granular error reporting
- Automatic retry logic
- Recovery options for failed executions

**Logging Reference**
> For detailed logging structure and formats, see **[VectorFlow Logging Reference](vectorflow_logging.md)**.

---

#### Development Best Practices

**Flow Design Patterns**
1. **Incremental Complexity**: Start simple, add branching logic incrementally
2. **Variable-Driven Logic**: Leverage variables for dynamic, reusable flows
3. **Comprehensive Testing**: Use real-time logger to validate each step
4. **Modular Architecture**: Break complex processes into smaller flows

**Performance Optimization**
1. **Parallel Processing**: Use Parallel nodes for independent operations
2. **Strategic Context**: Only retrieve vault context when needed
3. **Model Selection**: Match model complexity to task complexity
4. **Timeout Configuration**: Set realistic timeouts for external calls

**Security Considerations**
1. **Isolated Execution**: Act nodes run in sandboxed containers
2. **Credential Management**: Use environment variables, never hardcode
3. **Input Validation**: Validate and sanitize user inputs
4. **Access Control**: Use VectorVault's built-in permissions

---

## File Uploads

### uploadPdf()

```javascript
await vv.uploadPdf(pdfFile, vault, options);
```

Uploads and processes a PDF file into a vault.

**Parameters:**
- `pdfFile`: File object (PDF)
- `vault`: Target vault name
- `options` (optional): PDF processing options

**Options Object:**
```javascript
{
  summarize?: boolean;    // Generate summary of PDF
  splitSize?: number;     // Chunk size for splitting
}
```

**Example (Browser):**
```javascript
// In an HTML file input handler
document.getElementById('pdfInput').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  
  if (file && file.type === 'application/pdf') {
    const result = await vv.uploadPdf(file, 'documents', {
      summarize: true,
      splitSize: 1000
    });
    
    console.log('PDF uploaded successfully:', result);
  }
});
```

**Example (Node.js with FormData):**
```javascript
import fs from 'fs';
import { Blob } from 'buffer';

// Read PDF file
const pdfBuffer = fs.readFileSync('./document.pdf');
const pdfBlob = new Blob([pdfBuffer], { type: 'application/pdf' });

// Create File object
const pdfFile = new File([pdfBlob], 'document.pdf', { 
  type: 'application/pdf' 
});

await vv.uploadPdf(pdfFile, 'documents', {
  summarize: true,
  splitSize: 500
});
```

---

## Utility Methods

### fetch3DMap()

```javascript
const mapData = await vv.fetch3DMap(vault, highlightId);
```

Fetches 3D visualization data for a vault's vector space.

**Parameters:**
- `vault`: Vault name
- `highlightId` (optional): Item ID to highlight in visualization

**Example:**
```javascript
const mapData = await vv.fetch3DMap('my_vault', 42);
// Use mapData with a 3D visualization library
```

---

## Type Definitions

### FlowCallbacks

```typescript
interface FlowCallbacks {
  onMessage?: (partialMessage: string) => void;
  onLog?: (logData: any) => void;
  onError?: (error: any) => void;
}
```

### FlowResult

```typescript
interface FlowResult {
  response: string;
  logs: any[];
}
```

### PDFUploadOptions

```typescript
interface PDFUploadOptions {
  summarize?: boolean;
  splitSize?: number;
}
```

### GetSimilarParams

```typescript
interface GetSimilarParams {
  embeddings_model?: string | null;
  vault?: string;
  text: string;
  num_items?: number;
  include_distances?: boolean;
  vaults?: string | string[] | Record<string, number> | null;
}
```

### GetChatParams

```typescript
interface GetChatParams {
  vault?: string;
  embeddings_model?: string;
  text?: string;
  history?: string | null;
  summary?: boolean;
  get_context?: boolean;
  n_context?: number;
  return_context?: boolean;
  smart_history_search?: boolean;
  model?: string;
  include_context_meta?: boolean;
  custom_prompt?: string | boolean;
  temperature?: number;
  timeout?: number;
}
```

### AddCloudParams

```typescript
interface AddCloudParams {
  vault: string;
  embeddings_model?: string;
  text: string;
  meta?: any | null;
  name?: string | null;
  split?: boolean;
  split_size?: number;
  gen_sum?: boolean;
}
```

---

## Error Handling

All asynchronous methods return Promises and can throw errors. Always use proper error handling:

### Using async/await (Recommended)

```javascript
try {
  const response = await vv.getChat({
    vault: 'my_vault',
    text: 'Hello'
  });
  console.log(response);
} catch (error) {
  console.error('Error:', error.message);
}
```

### Using .then().catch()

```javascript
vv.getChat({
  vault: 'my_vault',
  text: 'Hello'
})
  .then(response => {
    console.log(response);
  })
  .catch(error => {
    console.error('Error:', error.message);
  });
```

### Common Error Types

| Error | Description | Solution |
|-------|-------------|----------|
| "Login failed" | Invalid credentials | Check email and password |
| "Deployment initialization failed" | Invalid deployment ID | Verify deployment ID |
| "Session expired" | Access token expired and refresh failed | Call `login()` again |
| "Request failed: 404" | Endpoint not found | Check API method and parameters |
| "Request failed: 401" | Unauthorized | Re-authenticate |
| Network errors | Connection issues | Check internet connection, retry |

### Automatic Token Refresh

The client automatically handles token refresh when:
- Token is within 60 seconds of expiration
- Request receives a 401 Unauthorized response

If token refresh fails, you'll need to re-authenticate:

```javascript
try {
  await vv.getVaults();
} catch (error) {
  if (error.message.includes('Session expired')) {
    // Re-authenticate
    await vv.login(email, password);
    // Retry operation
    await vv.getVaults();
  }
}
```

---

## Complete Example

Here's a complete example demonstrating common workflows:

```javascript
import VectorVault from 'vectorvault';

async function main() {
  // Initialize
  const vv = new VectorVault();
  
  try {
    // Authenticate
    await vv.login('user@example.com', 'password123');
    console.log('✓ Logged in successfully');
    
    // Create a vault
    await vv.createVault('product_docs');
    console.log('✓ Vault created');
    
    // Add some data
    await vv.addCloud({
      vault: 'product_docs',
      text: 'Our product uses advanced AI technology to analyze customer feedback.',
      meta: { source: 'docs', version: '1.0' },
      split: true
    });
    console.log('✓ Data added');
    
    // Get similar items
    const similar = await vv.getSimilar({
      vault: 'product_docs',
      text: 'How does the AI analysis work?',
      num_items: 3,
      include_distances: true
    });
    console.log('✓ Similar items:', similar);
    
    // Get a chat response with context
    let fullResponse = '';
    await vv.getChatStream(
      {
        vault: 'product_docs',
        text: 'Explain the AI features',
        get_context: true,
        n_context: 3,
        model: 'gpt-4o'
      },
      (chunk) => {
        fullResponse += chunk;
        process.stdout.write(chunk);
      }
    );
    console.log('\n✓ Chat completed');
    
    // Get vault statistics
    const total = await vv.getTotalItems('product_docs');
    console.log(`✓ Total items in vault: ${total.total}`);
    
    // List all vaults
    const vaults = await vv.getVaults();
    console.log('✓ Available vaults:', vaults);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    // Logout when done
    vv.logout();
    console.log('✓ Logged out');
  }
}

main();
```

---

## Additional Resources

### Documentation
- **[Quick Reference](QUICK_REFERENCE.md)** - Fast lookup guide
- **[API Documentation](API_DOCUMENTATION.md)** - Complete API reference
- **[VectorFlow Logging Reference](vectorflow_logging.md)** - Detailed logging structure
- **[Documentation Index](DOCUMENTATION_INDEX.md)** - Complete documentation guide

### Links
- **GitHub Repository**: https://github.com/John-Rood/vectorvault-js
- **NPM Package**: https://www.npmjs.com/package/vectorvault
- **Official Website**: https://vectorvault.io
- **VectorFlow Builder**: https://app.vectorvault.io/vector-flow
- **Support**: https://github.com/John-Rood/vectorvault-js/issues

---

## Notes

- Replace placeholder values (like `'your_email@example.com'`, `'your_password'`, `'your_vault_name'`, etc.) with your actual account and vault information.
- If you don't already have a VectorVault account, sign up at [vectorvault.io](https://vectorvault.io).

---

## License

MIT License - See LICENSE file for details

---

**Version:** 1.6.5  
**Last Updated:** November 2025

**Happy coding with VectorVault! 🚀**
