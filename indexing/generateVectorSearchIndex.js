import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' })

// Connect to your Atlas deployment
const client = new MongoClient(process.env.ATLAS_CONNECTION_STRING);

async function run() {
    try {
      const database = client.db("sample_airbnb");
      const collection = database.collection("listingsAndReviews");

      // Define your Atlas Vector Search index
      const index = {
          name: "vector_index",
          type: "vectorSearch",
          definition: {
            "fields": [
              {
                "type": "vector", // vector field indicates that this is a vector search index
                "numDimensions": 768, // number of dimensions in the vector 
                "path": "embeddings", // field name in the document
                "similarity": "cosine" // similarity metric to use, can be "cosine", "dotProduct", or "euclidean"
              }
            ]
          }
      }
      // Call the method to create the index
      const result = await collection.createSearchIndex(index);
      console.log(result);
    } finally {
      await client.close();
    }
}
run().catch(console.dir);