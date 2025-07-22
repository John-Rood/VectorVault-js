# VectorFlow Documentation

## Introduction

VectorFlow is a platform for building, deploying, and operating autonomous AI agents. While many tools focus on the initial challenge of creating conversational AI, VectorFlow is engineered to solve the subsequent, more complex challenges of running these systems reliably in production. It provides the infrastructure to move beyond simple request-response bots to create persistent, stateful agents that execute complex tasks over time.

## A New Execution Layer for AI

### The Limits of Request-Response
Most AI implementations today follow a stateless request-response pattern. A user sends a message, the system processes it, and returns an answer. This paradigm works well for simple chat interfaces but falls short when building systems that must:

- Remember context across multiple, asynchronous interactions.
- Operate independently without constant human supervision.
- Handle complex, multi-step processes that span hours or days.
- Maintain state while scaling in a serverless environment.
- Provide transparent, auditable logs of their decision-making process.

VectorFlow was built to address these limitations directly.

### The Persistent Agentic Runtime (PAR)
VectorFlow runs on a **Persistent Agentic Runtime (PAR)**. Instead of rebuilding context with each interaction, agents maintain continuous state. Instead of requiring human input for every step, they operate with temporal autonomy, responding to events in real time.

This is not a toolkit for building better chatbots. It is an execution layer designed for systems that need to work when no one is watching.

### Beyond Prompt Engineering
The current market paradigm centers on "ask → answer" interactions. VectorFlow operates on a different model:

- **Agents that persist and adapt:** Systems that learn and evolve over time.
- **Visual logic construction:** An interface for building complex reasoning flows, not just writing prompts.
- **Operational management:** A console for managing digital workers, not just chat widgets.

The difference matters when you need systems that are not just powerful, but also predictable, observable, and maintainable at scale.

## Getting Started

### Building Your Flow
- Visually design and build flows at **app.vectorvault.io/vector-flow**.
- Integrate leading models from OpenAI, Anthropic, xAI, and Google.
- Implement advanced reasoning patterns: Chain of Thought (COT), Tree of Thought (TOT), and Graph of Thought (GOT).

### Core Capabilities
- **API Integration:** Call external APIs within any flow.
- **Python Execution:** Run Python scripts in secure, sandboxed containers.
- **Public Demo Pages:** Deploy shareable web demos directly from the UI.
- **Multi-Platform Integration:** Connect via JavaScript, Python, Zapier, or webhooks.
- **Real-time Updates:** Changes made in the UI are reflected in production instantly.

### Architecture
- **Serverless & Stateless:** Hosted on Google Cloud Platform (GCP) for reliability and scale.
- **VFJSON Format:** Flows are saved as a portable VFJSON object in the cloud.
- **Secure Execution:** Code runs in isolated containers with controlled environments.
- **Real-time Logging:** Complete visibility into execution, outputs, and errors.

### Variable System
- **Bracket Notation:** Use `{variable_name}` syntax to reference variables in any text field.
- **Dynamic Assignment:** Set variables with node outputs or within custom code.
- **Runtime Parameters:** Pass key-value arguments to `run_flow()` to set internal variables at runtime.
- **Environment Access:** Variables are accessible as environment variables in Act nodes.
- **Global Context:** All nodes have access to the current message and conversation history.

### Advanced Features
- **Customer Personalization:** Use runtime variables for individualized experiences.
- **Fine-grained Control:** Access advanced parameters via the settings cog in the UI builder.
- **Security Boundaries:** Act nodes are restricted to Python's built-in modules for security.

## JavaScript Integration

### `runFlow()`
Use `runFlow()` to execute a flow and receive the complete response after it finishes.

```javascript
import VectorVault from 'vectorvault';

const vectorVault = new VectorVault();
await vectorVault.login('your_email', 'your_password');

// Run flow and get complete response
const result = await vectorVault.runFlow(
    'flow_name',              // string - Flow identifier
    'user_message',           // string - User message
    'chat_history',           // string - Chat history (optional)
    'user_id',                // string - Conversation user ID (optional)
    'session_id',             // string - Session identifier (optional)
    'invoke_method',          // string - Arbitrary label for logs (optional)
    { customVar: 'value' }    // object - Runtime variables (optional)
);

console.log(result.response); // Full AI response
console.log(result.logs);     // Execution logs
```

### `runFlowStream()`
Use `runFlowStream()` to receive events, logs, and message chunks in real-time as the flow executes.

```javascript
// Stream logs and messages in real-time
const callbacks = {
    onLog: (log) => console.log('[LOG]', log),
    onMessage: (chunk) => process.stdout.write(chunk),
    onError: (err) => console.error('Error:', err)
};

const result = await vectorVault.runFlowStream(
    'flow_name',
    'user_message',
    'chat_history',
    'user_id',
    'session_id', 
    'invoke_method',
    { customVar: 'value' },
    callbacks
);
```

## Node Types Reference

### Core Logic Nodes

#### Start
- **Purpose**: Every journey needs a starting point. The **Start** node is the designated starting point for every flow. 
- **Inputs**: 0
- **Outputs**: 1

#### Recognize
- **Purpose**: This is your AI's short-term memory and decision-making brain. Use the **Recognize** node to ask a simple yes/no question about the user's message (e.g., "Is the user asking for a refund?"). Based on the AI's "yes" or "no" answer, you can instantly branch the conversation down different paths, creating responsive and intelligent logic.
- **Inputs**: 1
- **Outputs**: 2 (Yes, No)

#### Multiple Choice (list_match)
- **Purpose**: Think of this as an AI-powered router. The **Multiple Choice** node takes a user's message and intelligently categorizes it into one of several paths you define. Instead of relying on rigid keywords, you can provide a list of options (e.g., "Sales Inquiry," "Technical Support," "Billing Question"), and the AI will determine the best fit, ensuring every message gets to the right place.
- **Inputs**: 1
- **Outputs**: Dynamic (one for each option)

#### If/Then
- **Purpose**: This node brings traditional programming logic to your flow. The **If/Then** node lets you check the value of any variable you've set and branch the flow accordingly. For example, `if {user_plan} == "premium"`, you can route them to a priority support path. It’s essential for creating personalized experiences and complex, stateful logic.
- **Inputs**: 1
- **Outputs**: 2 (True, False)

### Response Nodes

#### Respond
- **Purpose**: This is the voice of your agent. The **Respond** node is how your flow communicates back to the user. You can craft dynamic AI-generated responses using context from a vector database, or provide a simple, static message. This is the final step in most conversational branches, delivering the information or answer the user was looking for.
- **Inputs**: 1
- **Outputs**: 1

#### Generate
- **Purpose**: Use this node as your AI's creative engine for internal tasks. The **Generate** node creates text but, instead of sending it to the user, saves it to a variable. You can use this to summarize a long conversation, generate a subject line for an email, create a search query based on user intent, or prepare a piece of data before sending it to another system.
- **Inputs**: 1
- **Outputs**: 1

#### Number
- **Purpose**: When you need a quantitative answer, the **Number** node delivers. Ask the AI to extract a number from the user's text (e.g., "How many items did they order?") or to generate a score based on their message (e.g., "Rate this user's satisfaction from 1 to 10"). The result is saved to a variable, perfect for calculations, conditional logic, or data logging.
- **Inputs**: 1
- **Outputs**: 1

### Data Processing Nodes

#### Capture
- **Purpose**: This node turns messy conversation into clean, structured data. Use the **Capture** node to pull specific pieces of information from the user's message, like a name, email address, order number, or a summary of their problem. Each piece of data is saved to its own variable, making it easy to populate a CRM, call an API, or personalize the rest of the conversation.
- **Inputs**: 1
- **Outputs**: 1

#### Act
- **Purpose**: The **Act** node is your gateway to the outside world and to complex logic that goes beyond standard nodes. It lets you run Python code in a secure sandbox. Use it to call third-party APIs (e.g., checking order status, looking up weather), perform complex calculations, or interact with other systems. It's the ultimate tool for extensibility, allowing your agent to take real-world actions.
- **Inputs**: 1
- **Outputs**: 1

#### Variable
- **Purpose**: This node allows you to set or modify a variable with a fixed value. Use the **Variable** node to define default settings, store counters, or set flags that you can check later with an If/Then node. It's a fundamental building block for creating flows that have memory and state.
- **Inputs**: 1
- **Outputs**: 1

### External Integration Nodes

#### Email
- **Purpose**: Take the conversation beyond the chat window. The **Email** node allows your agent to send an email via any SMTP server. You can send a transcript of the conversation to a support agent, notify a sales rep about a new lead, or send a confirmation message to the user. All fields (To, Subject, Body) can be populated dynamically using variables from your flow.
- **Inputs**: 1
- **Outputs**: 1

#### Google Search
- **Purpose**: Give your agent access to the world's information. The **Google Search** node performs a real-time web search and saves the results to a variable. This allows your agent to answer questions about current events, look up product specifications, or find information that isn't in its pre-existing knowledge base, ensuring its answers are always up-to-date.
- **Inputs**: 1
- **Outputs**: 1

#### Download URL (website)
- **Purpose**: This node lets your agent "read" a webpage. Use the **Download URL** node to pull in the content from any URL and save it to a variable. You can then use this content as context for an AI response, extract information from it using a Capture node, or pass it to another system. It's perfect for ingesting knowledge from articles, documentation, or simple APIs.
- **Inputs**: 1
- **Outputs**: 1

#### Run Flow
- **Purpose**: This node lets you build complex agents out of smaller, reusable parts. The **Run Flow** node calls another one of your flows as a "sub-routine." This is incredibly powerful for organizing your logic. You could have a main router flow that calls specialized flows for handling sales, support, or onboarding, keeping each component simple and manageable.
- **Inputs**: 1
- **Outputs**: 1

### Storage & Data Nodes

#### Storage
- **Purpose**: This is your agent's long-term memory. The **Storage** node lets you save and retrieve information from VectorVault's persistent key-value store. You can track user preferences, store conversation history across sessions, or manage state for long-running tasks. This is what allows your agents to be truly stateful and remember users over time.
- **Inputs**: 1
- **Outputs**: 1

#### Add To Vault
- **Purpose**: Make your agent smarter with every conversation. The **Add To Vault** node takes a piece of text and adds it to your vector database. This means your agent can learn from its interactions. For example, if a user provides a solution to a problem, you can add that solution to the vault so the agent can use it to help other users in the future.
- **Inputs**: 1
- **Outputs**: 1

### Control Flow Nodes

#### Parallel
- **Purpose**: Don't wait for things to happen one by one. The **Parallel** node lets you run multiple branches of your flow at the same time. For example, you could simultaneously call an API, perform a Google search, and generate a summary of the conversation. The flow will only continue after all parallel tasks are complete, dramatically speeding up complex operations.
- **Inputs**: 1
- **Outputs**: 2

#### Wait
- **Purpose**: Sometimes, the best action is to wait. The **Wait** node pauses your flow for a specific amount of time—from seconds to days. Use it to create a more natural-feeling delay in conversation, schedule a follow-up message for the next day, or wait for an external system to process data before continuing.
- **Inputs**: 1
- **Outputs**: 1

#### No Response
- **Purpose**: This node provides a clean exit. The **No Response** node ends the flow without sending a message back to the user. This is useful when the agent's job is done behind the scenes (like updating a CRM), or when another system will be handling the user communication. It's a way to say "my work here is done."
- **Inputs**: 1
- **Outputs**: 0


## Development Patterns

### Flow Design
1. **Incremental Complexity**: Begin with simple, linear flows and add branching logic and sub-flows incrementally.
2. **Variable-Driven Logic**: Leverage the variable system to create dynamic, reusable flows.
3. **Comprehensive Testing**: Use the real-time logger to validate behavior at each step.
4. **Modular Architecture**: Break complex processes into smaller, single-purpose flows and link them with the Run Flow node.

### Performance Optimization
1. **Parallel Processing**: Use Parallel nodes for independent, time-consuming operations.
2. **Strategic Context**: Only retrieve vault context in nodes that require it for their immediate task.
3. **Model Selection**: Use smaller, faster models for simple tasks like classification and more powerful models for complex generation.
4. **Timeout Configuration**: Set realistic timeouts for external API calls and code execution.

### Security Considerations
1. **Isolated Execution**: Act nodes run in sandboxed containers with no file system access.
2. **Credential Management**: Use environment variables for sensitive data rather than hardcoding it.
3. **Input Validation**: Validate and sanitize user inputs before processing or passing them to external systems.
4. **Access Control**: Use VectorVault's built-in permissions to manage access to flows and vaults.

## Deployment Options

### Public Demo Pages
- Deploy shareable web interfaces for your flows directly from the builder.
- Ideal for stakeholder demonstrations and proof-of-concept validation.
- Instant deployment with automatic scaling.

### API Integration
- RESTful API access to all of your flows.
- Webhook support for triggering flows from external systems.
- Built-in rate limiting and authentication.

### Platform Integration
- **JavaScript/React**: A full-featured SDK for web applications.
- **Python**: A native Python client for backend services.
- **Zapier**: A no-code integration to connect with thousands of other applications.
- **Custom Webhooks**: A generic HTTP endpoint for all other integrations.

## Technical Specifications

### Model Support
- **OpenAI**: GPT-4, GPT-3.5-turbo, and other leading models.
- **Anthropic**: The Claude 3 family (Haiku, Sonnet, Opus).
- **xAI**: Grok models.
- **Google**: Gemini and PaLM models.
- **Fine-tuned Models**: Support for custom-trained models.

### Observability
- **Real-time Logging**: A live view of every step of an execution.
- **Historical Tracking**: A complete, permanent audit trail of all flow runs.
- **Performance Metrics**: Detailed data on response times and success rates.
- **Error Handling**: Granular error reporting and recovery options.

### Infrastructure
- **Serverless Architecture**: Automatic scaling to handle any load.
- **Global Distribution**: Low-latency execution from data centers around the world.
- **High Availability**: Enterprise-grade uptime and reliability.
- **Load Balancing**: Intelligent request distribution for optimal performance.

## Conclusion

VectorFlow provides the foundational infrastructure for developing, deploying, and managing the next generation of autonomous AI systems. It bridges the gap between conversational AI and production-grade agents, enabling developers to build systems that are not only intelligent but also robust, scalable, and observable.

Get started at **[app.vectorvault.io](https://app.vectorvault.io)**