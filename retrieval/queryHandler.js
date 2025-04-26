import { queryRAG } from './ragHandler.js';


// const result = await queryRAG("Looking for a cozy apartment with ocean view");
const result = await queryRAG("List of Beach houses");
console.log(result);

// question1 = "List of all apartments"
// question2 = "List of Beach houses"
// question3 = "Can you recommend a few AirBnBs that are beach houses? Include a link to the listing."
