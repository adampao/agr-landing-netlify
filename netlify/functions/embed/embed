// netlify/functions/embed/embed.js
import { OpenAIApi, Configuration } from "openai";

export async function handler(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const openai = new OpenAIApi(new Configuration({
    apiKey: process.env.OPENAI_API_KEY
  }));

  try {
    const { text } = JSON.parse(event.body);
    const response = await openai.createEmbedding({
      model: "text-embedding-3-large",
      input: text
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ embedding: response.data.data[0].embedding })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
}
