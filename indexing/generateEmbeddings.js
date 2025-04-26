import { MongoClient } from "mongodb";
import { OllamaEmbeddings } from "@langchain/ollama";
import { MongoDBAtlasVectorSearch } from "@langchain/mongodb";
// import { HuggingFaceTransformersEmbeddings } from "@langchain/community/embeddings/huggingface_transformers";
import dotenv from "dotenv";

dotenv.config({ path: './.env' })

export const generateEmbeddings = async () => {
    console.log("Starting to generate embeddings");
    console.log("Connecting to MongoDB: ", process.env.ATLAS_CONNECTION_STRING);

    const client = new MongoClient(process.env.ATLAS_CONNECTION_STRING);
    try {
        // Connect to your local MongoDB deployment
        await client.connect();
        const database = client.db("sample_airbnb");
        const collection = database.collection("listingsAndReviews");
        
        const embeddings = new OllamaEmbeddings({
            model: "nomic-embed-text",
            baseUrl: "http://localhost:11434"  // Default Ollama server URL
        });

        const filter = { 'summary': { '$exists': true, "$nin": [ null, "" ]  } }

        const cursor = collection.find(filter).limit(100);
        const firstDoc = await cursor.next();
        if(!firstDoc) {
            console.log("No documents found");
            return;
        }

        const vectorStore = new MongoDBAtlasVectorSearch(
            embeddings,
            { 
                collection,
                textKey: "summary",
                embeddingKey: "embeddings",
                indexName: "default",
            }
        );

        // const firstDocEmbeddings = await getEmbeddings(firstDoc.summary);
        // console.log(firstDocEmbeddings);

        cursor.rewind(); // Reset the cursor to the beginning
        console.log("Starting to generate embeddings for all 50 documents");

        for await (const doc of cursor) {
            try {
                const embeddings = await vectorStore.embeddings.embedDocuments([doc.summary]);
                console.log(`Embeddings for document ${doc._id}:`, embeddings);
                await collection.updateOne(
                    { _id: doc._id },
                    { 
                        $set: { 
                            embeddings: embeddings[0]
                        }
                    }
                );
                console.log(`Successfully processed document ${doc._id}`);
            } catch (error) {
                console.error(`Error processing document ${doc._id}:`, error);
                continue; // Skip to next document on error

            }
        }

    } catch (error) {
        console.error("Error connecting to MongoDB:");
        console.error(error);
    } finally {
        console.log("Closing connection to MongoDB");
        await client.close();
    }
}

generateEmbeddings().catch(console.error);