import { MongoClient } from "mongodb";
import { ChatOllama } from '@langchain/ollama';
import { MongoDBAtlasVectorSearch } from "@langchain/mongodb";
import { OllamaEmbeddings } from "@langchain/ollama";
import { StringOutputParser } from '@langchain/core/output_parsers';
import { RunnableSequence } from '@langchain/core/runnables';
import { PromptTemplate } from '@langchain/core/prompts';
import dotenv from "dotenv";

dotenv.config({ path: './.env' });

export const initializeRAG = async () => {
    const client = new MongoClient(process.env.ATLAS_CONNECTION_STRING);
    try {
        await client.connect();
        const database = client.db("sample_airbnb");
        const collection = database.collection("listingsAndReviews");

        // Initialize embeddings model
        const embeddings = new OllamaEmbeddings({
            model: "nomic-embed-text",
            baseUrl: "http://localhost:11434"
        });

        // Initialize vector store with enhanced configuration
        const vectorStore = new MongoDBAtlasVectorSearch(
            embeddings,
            { 
                collection,
                textKey: "summary",
                embeddingKey: "embeddings",
                indexName: "vector_index",
                searchType: "similarity",
                searchOptions: {
                    numCandidates: 100,
                    limit: 5
                }
            }
        );

        // Initialize LLM
        const llm = new ChatOllama({
            model: 'llama3.2',
            baseUrl: 'http://localhost:11434', // Default Ollama server URL
        });

        // Create a custom RAG prompt template
        const promptTemplate = PromptTemplate.fromTemplate(`
            You are a helpful assistant specializing in Airbnb property information. Use the following property listings context to answer the question. Include relevant details like property features, locations, and listing URLs when available. If you don't know the answer, just say that you don't know.

            Property Listings Context:
            {context}
            
            Question: {question}
            
            Answer: Let me help you with that.
        `);

        // Create the chain
        const chain = RunnableSequence.from([
            promptTemplate,
            llm,
            new StringOutputParser()
        ]);

        return {
            vectorStore,
            chain,
            client
        };
    } catch (error) {
        console.error("Error initializing RAG components:", error);
        throw error;
    }
};

export const queryRAG = async (question) => {
    console.log("Starting RAG query: ", question);
    let client;
    try {
        const { vectorStore, chain, mongoClient } = await initializeRAG();
        client = mongoClient;

        // Get embeddings for the question
        const queryEmbedding = await vectorStore.embeddings.embedQuery(question);

        // Define the search pipeline
        const pipeline = [
            {
                $vectorSearch: {
                    index: "vector_index",
                    queryVector: queryEmbedding,
                    path: "embeddings",
                    exact: true,
                    limit: 5
                }
            },
            {
                $project: {
                    _id: 0,
                    summary: 1,
                    listing_url: 1,
                    name:1,
                    score: {
                        $meta: "vectorSearchScore"
                    }
                }
            }
        ];

        // Execute the pipeline
        const retrievedDocs = await vectorStore.collection.aggregate(pipeline).toArray();
        console.log("Number of documents retrieved:", retrievedDocs.length);
        console.log("Retrieved documents:", retrievedDocs);

        if (!retrievedDocs || retrievedDocs.length === 0) {
            return { answer: "No relevant information found." };
        }

        // Convert retrieved documents to text content
        const context = retrievedDocs.map(doc => doc.summary).join("\n");

        // Generate response using the chain
        const response = await chain.invoke({
            question,
            context
        });

        return {
            answer: response,
            context: retrievedDocs.map(doc => ({
                summary: doc.summary,
                listing_url: doc.listing_url,
                score: doc.score
            }))
        };
    } catch (error) {
        console.error("Error in RAG query:", error);
        throw error;
    } finally {
        if (client) {
            await client.close();
        }
    }
};