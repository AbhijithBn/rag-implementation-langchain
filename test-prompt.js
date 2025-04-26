import { ChatOllama } from '@langchain/ollama'
import { StringOutputParser } from '@langchain/core/output_parsers';
import { RunnableSequence } from '@langchain/core/runnables';
import { PromptTemplate } from '@langchain/core/prompts';

// Initialize the Ollama model with Llama 2
const model = new ChatOllama({
    model: 'llama3.2',
    baseUrl: 'http://localhost:11434', // Default Ollama server URL
});

// Create a prompt template
const promptTemplate = PromptTemplate.fromTemplate(`
Answer the following question based on the context provided.
Question: {question}
Answer: Let me help you with that.
`);

// Create a chain that will execute the sequence
const chain = RunnableSequence.from([
    promptTemplate,
    model,
    new StringOutputParser()
]);

// Example usage
async function main() {
    try {
        console.log('Starting the chain...');
        const response = await chain.invoke({
            // question: 'List of all apartments'
            // question: 'List of Beach houses'
            question: 'Can you recommend a few AirBnBs that are beach houses? Include a link to the listing'
        });
        console.log('Response:', response);
    } catch (error) {
        console.error('Error:', error);
    }
}

main();