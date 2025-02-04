import { OpenAIApi, Configuration } from "openai";
import { chunks } from './chunks.js';

const SYSTEM_MESSAGE = `You are Aristotle, the ancient Greek philosopher...`; // Add full system message here

async function getEmbedding(text) {
  const response = await fetch('/.netlify/functions/embed', {
    method: 'POST',
    body: JSON.stringify({ text })
  });
  const data = await response.json();
  return data.embedding;
}

async function getMostRelevantChunk(question) {
  const questionEmbedding = await getEmbedding(question);
  let maxSimilarity = -Infinity;
  let mostRelevantChunk = chunks[0];

  for (const chunk of chunks) {
    const chunkEmbedding = await getEmbedding(chunk);
    const similarity = cosineSimilarity(questionEmbedding, chunkEmbedding);
    if (similarity > maxSimilarity) {
      maxSimilarity = similarity;
      mostRelevantChunk = chunk;
    }
  }
  return mostRelevantChunk;
}

function cosineSimilarity(a, b) {
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dotProduct / (magnitudeA * magnitudeB);
}

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const openai = new OpenAIApi(new Configuration({
    apiKey: process.env.OPENAI_API_KEY
  }));

  try {
    const { question } = JSON.parse(event.body);
    const relevantChunk = await getMostRelevantChunk(question);
    
    const response = await openai.createChatCompletion({
      model: "gpt-4",
      messages: [
        { role: "system", content: SYSTEM_MESSAGE },
        { role: "user", content: `Text: ${relevantChunk}\n\nQuestion: ${question}` }
      ]
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ answer: response.data.choices[0].message.content })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};