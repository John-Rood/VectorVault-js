import VectorVault from './index.js';

function handleStreamedData(data) {
    // Here you can process the data, update UI, store in a database, etc.
    console.log(data);
}

async function runTests(user, vault, api, openai_key) {
    const vectorVault = new VectorVault(user, vault, api, openai_key);
    let personalityMessage = 'Say everything ominously like you are Darth Vader';
    let customPromptNoContext = `Chat History (if any): {history}
    Question: {content}`;
    let longTextToSummarize = `To gain significant power from an average current station, one must be willing to take bold and innovative actions. This includes following the paths of great men and imitating their strategies, even if your abilities do not match theirs. Aim higher than your target, so even if you fall short, you'll still achieve your goal. 
    You must be able to rely on yourself and use force when necessary. Armed prophets have conquered, while the unarmed ones have been destroyed. It's crucial to understand that people are variable, and while it's easy to persuade them, it's difficult to keep them persuaded. Therefore, you must be prepared to enforce your beliefs by force if necessary.
    Remember, introducing a new order of things is a challenging task. You'll face opposition from those who benefited from the old order and lukewarm support from those who might benefit from the new. Despite these challenges, with ability and determination, you can overcome them and establish your rule. Once you've acquired power, it's easier to maintain it. 
    Lastly, don't rely solely on fortune but seize opportunities. Like Hiero the Syracusan, rise from your current station, organize your resources, and build your foundation. With these strategies, you can transition from an average station to a position of significant power.`
    let customPrompt = `Use the following Context to answer the Question at the end. 
    Answer as if you were the modern voice of the context, without referencing the context or mentioning 
    the fact that any context has been given. Make sure to not just repeat what is referenced. Don't preface or give any warnings at the end. 
    
    Chat History (if any): {history}
    
    Additional Context: {context}
    
    Question: {content}`;


    try {// Basic get_chat
        console.log("\n<<< get_chat basic >>>", await vectorVault.getChat({ text: 'Hi' }));
        
        // Get_chat with history
        console.log("\n<<< get_chat history >>>", await vectorVault.getChat({ text: 'Who did I play?', history: "I played your mom" }));
        
        // Get_chat with summary
        console.log("\n<<< get_chat summary >>>", await vectorVault.getChat({ text: longTextToSummarize, summary: true }));
        
        // Get_chat with get_context
        console.log("\n<<< get_chat get_context >>>", await vectorVault.getChat({ text: 'How to win', get_context: true }));
        
        // Get_chat with return_context
        console.log("\n<<< get_chat return_context >>>", await vectorVault.getChat({ text: 'How to win', get_context: true, return_context: true }));
        
        // Get_chat with smart_history_search
        console.log("\n<<< get_chat smart_history_search >>>", await vectorVault.getChat({ text: 'How to win', smart_history_search: true }));
        
        // Get_chat with a specific model
        console.log("\n<<< get_chat model=GPT4 >>>", await vectorVault.getChat({ text: 'How to win', model: 'gpt-4' }));
        
        // Get_chat with include_context_meta
        console.log("\n<<< get_chat include_context_meta >>>", await vectorVault.getChat({ text: 'How to win', include_context_meta: true }));
        
        // Get_chat with custom_prompt (no context)
        console.log("\n<<< get_chat custom_prompt (no context) >>>", await vectorVault.getChat({ text: 'How to win', custom_prompt: customPromptNoContext }));
        
        // Get_chat with custom_prompt (with context)
        console.log("\n<<< get_chat custom_prompt (with context) >>>", await vectorVault.getChat({ text: 'How to win', custom_prompt: customPrompt, get_context: true }));
        
        // Get_chat with temperature
        console.log("\n<<< get_chat temperature >>>", await vectorVault.getChat({ text: 'How to win', temperature: 1 }));
        
        // Basic get_chat_stream
        console.log("\n<<< get_chat_stream basic >>>");
        await vectorVault.getChatStream({ text: 'Hi' }, handleStreamedData);
        
        // Get_chat_stream with history
        console.log("\n<<< get_chat_stream history >>>");
        await vectorVault.getChatStream({ text: 'Who did I play?', history: "I played your mom" }, handleStreamedData);
        
        // Get_chat_stream with summary
        console.log("\n<<< get_chat_stream summary >>>");
        await vectorVault.getChatStream({ text: longTextToSummarize, summary: true }, handleStreamedData);
        
        // Get_chat_stream with get_context
        console.log("\n<<< get_chat_stream get_context >>>");
        await vectorVault.getChatStream({ text: 'How to win', get_context: true }, handleStreamedData);
        
        // Get_chat_stream with return_context -- Currently not working... return_context is not ideal in a stream
        // console.log("\n<<< get_chat_stream return_context >>>");
        // await vectorVault.getChatStream({ text: 'How to win', get_context: true, return_context: true }, handleStreamedData);
        
        // Get_chat_stream with smart_history_search
        console.log("\n<<< get_chat_stream smart_history_search >>>");
        await vectorVault.getChatStream({ text: 'How to win', smart_history_search: true }, handleStreamedData);
        
        // Get_chat_stream with a specific model
        console.log("\n<<< get_chat_stream model=GPT4 >>>");
        await vectorVault.getChatStream({ text: 'How to win', model: 'gpt-4' }, handleStreamedData);
        
        // Get_chat_stream with include_context_meta
        console.log("\n<<< get_chat_stream include_context_meta >>>");
        await vectorVault.getChatStream({ text: 'How to win', include_context_meta: true }, handleStreamedData);
        
        // Get_chat_stream with custom_prompt (no context)
        console.log("\n<<< get_chat_stream custom_prompt (no context) >>>");
        await vectorVault.getChatStream({ text: 'How to win', custom_prompt: customPromptNoContext }, handleStreamedData);
        
        // Get_chat_stream with custom_prompt (with context)
        console.log("\n<<< get_chat_stream custom_prompt (with context) >>>");
        await vectorVault.getChatStream({ text: 'How to win', custom_prompt: customPrompt, get_context: true }, handleStreamedData);
        
        // Get_chat_stream with temperature
        console.log("\n<<< get_chat_stream temperature >>>");
        await vectorVault.getChatStream({ text: 'How to win', temperature: 1 }, handleStreamedData);
        
        // 1. Get Items
        const items = await vectorVault.getItems([1]);
        console.log("\n<<< get_items >>>\n", items);

        // 2. Save the item to a variable
        let randVar = items[0];
        let originalLength = randVar['data'].length;
        let new_data = randVar['data'].substring(0, originalLength - 20);

        // 3. Edit the item
        const editResponse = await vectorVault.editItem(1, new_data);
        console.log("\n<<< edit_items >>>\n", editResponse);

        // 4. Verify it is different
        const editedItem = await vectorVault.getItems([1]);
        console.log('Original Length:', originalLength, 'New Length:', editedItem[0]['data'].length);

        // 5. Delete the item
        const deleteResponse = await vectorVault.deleteItems(1);
        console.log("\n<<< delete_items >>>\n", deleteResponse);

        // 6. Verify one less item
        const totalItemsAfterDelete = await vectorVault.getTotalItems();
        console.log("\n<<< get_total_items >>>\n", totalItemsAfterDelete);

        // 7. Add the item back
        const addCloudResponse = await vectorVault.addCloud({text: randVar['data']});
        console.log("\n<<< add_cloud >>>\n", addCloudResponse);

        // 8. Verify one more item
        const totalItemsAfterAdd = await vectorVault.getTotalItems();
        console.log("\n<<< get_total_items >>>\n", totalItemsAfterAdd);
        console.log('Total items change successful:', totalItemsAfterDelete !== totalItemsAfterAdd);

        // 9. Get Vaults
        const vaults = await vectorVault.getVaults();
        console.log("\n<<< get_vaults >>>\n", vaults);

        // 10. Get Distance
        const distance = await vectorVault.getDistance(1, 2);
        console.log("\n<<< get_distance >>>\n", distance);

        // 11. Get Similar
        const similar = await vectorVault.getSimilar({text: "the prince shall win"});
        console.log("\n<<< get_similar >>>\n", similar);

        // 12. Save Personality Message
        await vectorVault.savePersonalityMessage(personalityMessage);
        console.log("\n<<< save_personality_message >>>");

        // 13. Fetch Personality Message
        const fetchedPersonalityMessage = await vectorVault.fetchPersonalityMessage();
        console.log("\n<<< fetch_personality_message >>>\n", fetchedPersonalityMessage, "Save successful:", personalityMessage === fetchedPersonalityMessage);

        // 14. Save Custom Prompt
        await vectorVault.saveCustomPrompt(customPrompt);
        console.log("\n<<< save_custom_prompt >>>");

        // 15. Fetch Custom Prompt
        const fetchedCustomPrompt = await vectorVault.fetchCustomPrompt();
        console.log("\n<<< fetch_custom_prompt >>>\n", fetchedCustomPrompt, "Save successful:", fetchedCustomPrompt === customPrompt);

    } catch (error) {
        console.error("Test Error:", error);
    }
}

const user = 'youremail@example.com'
const vault = 'vault_name'
const api = 'your_vectorvault_api_key'
const openai_key = 'your_openai_api_key'

runTests(user, vault, api, openai_key);



// const vectorVault = new VectorVaultAPI(user, vault, api, openai_key);

// // Define the parameters for the getChat method as an object
// const chatParams = {
//     text: "Hello, world!",
//     history: null, // or your chat history
//     summary: false,
//     get_context: false,
//     n_context: 4,
//     return_context: false,
//     smart_history_search: false,
//     model: "gpt-3.5-turbo",
//     include_context_meta: false,
//     custom_prompt: false,
//     temperature: 0,
//     timeout: 45
// };


// // Call the getChat method and handle the response
// vectorVault.getChat(chatParams)
//     .then(response => {
//         console.log("Response from Vector Vault API:", response);
//     })
//     .catch(error => {
//         console.error("Error calling Vector Vault API:", error);
//     });


// // Define the parameters for the getChatStream method as an object
// const streamParams = {
//     text: "Hello, world!",
//     history: null, // or your chat history
//     // add other parameters as needed, similar to chatParams
// };


// // Call the getChatStream method
// vectorVault.getChatStream(streamParams, handleStreamedData)
//     .then(() => {
//         console.log("Stream completed.");
//     })
//     .catch(error => {
//         console.error("Error:", error);
//     });


// // Call the getItems method
// vectorVault.getItems([1])
//     .then(items => {
//         console.log("Items:", items);
//         // Handle the retrieved items as needed
//     })
//     .catch(error => {
//         console.error("Error:", error);
//     });


// // Call the deleteItems method
// vectorVault.deleteItems('1')
//     .then(response => {
//         console.log("Response:", response);
//         // Handle the response as needed
//     })
//     .catch(error => {
//         console.error("Error:", error);
//     });


// // Call the editItem method
// vectorVault.editItem(itemId, newText)
//     .then(response => {
//         console.log("Response:", response);
//         // Handle the response as needed
//     })
//     .catch(error => {
//         console.error("Error:", error);
//     });


// // Call the getTotalItems method
// vectorVault.getTotalItems()
//     .then(responseData => {
//         console.log("Success:", responseData);
//         // Handle the response as needed
//     })
//     .catch(error => {
//         console.error("Error:", error);
//     });


// Call the addCloud method
// vectorVault.addCloud({text: "I have some text data yoooo"})
//     .then(response => {
//         console.log("Response:", response);
//         // Handle the response as needed
//     })
//     .catch(error => {
//         console.error("Error:", error);
//     });


// // Call the getVaults method
// vectorVault.getVaults()
//     .then(vaults => {
//         console.log("Vaults:", vaults);
//         // Handle the vaults data as needed
//     })
//     .catch(error => {
//         console.error("Error:", error);
//     });


// // Call the getDistance method
// vectorVault.getDistance(1, 2)
//     .then(distance => {
//         console.log("Distance:", distance);
//         // Handle the distance data as needed
//     })
//     .catch(error => {
//         console.error("Error:", error);
//     });


// Call the getSimilar method
// vectorVault.getSimilar({text: "what's similar to this?"})
//     .then(similarItems => {
//         console.log("Similar Items:", similarItems);
//         // Handle the similar items data as needed
//     })
//     .catch(error => {
//         console.error("Error:", error);
//     });


// // Call the savePersonalityMessage method
// vectorVault.savePersonalityMessage(personality_message)
//     .then(response => {
//         console.log("Response:", response);
//         // Handle the response as needed
//     })
//     .catch(error => {
//         console.error("Error:", error);
//     });


// // Call the fetchPersonalityMessage method
// vectorVault.fetchPersonalityMessage()
//     .then(personalityMessage => {
//         console.log("Personality Message:", personalityMessage);
//         // Handle the personality message data as needed
//     })
//     .catch(error => {
//         console.error("Error:", error);
//     });


// let custom_prompt = `Use the following Context to answer the Question at the end. 
// Answer as if you were the modern voice of the context, without referencing the context or mentioning 
// the fact that any context has been given. Make sure to not just repeat what is referenced. Don't preface or give any warnings at the end. 

// Chat History (if any): {history}

// Additional Context: {context}

// Question: {content}
// `
// // Call the saveCustomPrompt method
// vectorVault.saveCustomPrompt(custom_prompt)
//     .then(response => {
//         console.log("Response:", response);
//         // Handle the response as needed
//     })
//     .catch(error => {
//         console.error("Error:", error);
//     });


// // Call the fetchCustomPrompt method
// vectorVault.fetchCustomPrompt()
//     .then(customPrompt => {
//         console.log("Custom Prompt:", customPrompt);
//         // Handle the custom prompt data as needed
//     })
//     .catch(error => {
//         console.error("Error:", error);
//     });
    
