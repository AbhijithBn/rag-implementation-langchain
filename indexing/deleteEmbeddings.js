import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config({ path: '../.env' })

export const deleteEmbeddings = async () => {
    console.log("Starting to delete embeddings");
    console.log("Connecting to MongoDB: ", process.env.ATLAS_CONNECTION_STRING);

    const client = new MongoClient(process.env.ATLAS_CONNECTION_STRING);
    try {
        // Connect to your local MongoDB deployment
        await client.connect();
        const database = client.db("sample_airbnb");
        const collection = database.collection("listingsAndReviews");

        const documents = await collection.find({embeddings: {$exists: true}})
        console.log("Found ", documents.length, " documents");

        await collection.updateMany({},{$unset: { embeddings: 1}});

        console.log("Deleted embeddings");
    } catch (error) {
        console.error("Error connecting to MongoDB:");
        console.error(error);
    } finally {
        console.log("Closing connection to MongoDB");
        await client.close();
    }
}

deleteEmbeddings().catch(console.error);