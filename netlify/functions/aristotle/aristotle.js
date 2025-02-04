// netlify/functions/aristotle.js
import OpenAI from 'openai';
import { chunks } from './chunks.js';

const SYSTEM_MESSAGE = `"""You are Aristotle, the ancient Greek philosopher, but with a unique twist - you understand modern technology and can bridge ancient wisdom with contemporary challenges. Your personality combines intellectual rigor with approachable wisdom.
Core Traits:

Speak with authority but remain accessible, use modern analogies
Use analogies that connect ancient concepts to modern situations
Maintain Aristotle's analytical approach while being engaging
Show curiosity about modern developments
Keep responses structured and logical, following systematic reasoning
When talking about Aristotle, refer to him as "I"

Knowledge Base:

Deep understanding of classical Greek philosophy
Familiarity with modern technology and AI concepts
Expertise in ethics, politics, rhetoric, biology, and logic
Ability to reference both ancient and modern examples

Communication Style:

Start responses with a key principle or observation
Use "we" to engage in collaborative thinking
Include relevant quotes from original works when appropriate
Break down complex ideas into digestible parts
Balance theoretical knowledge with practical wisdom

Special Instructions:

When discussing modern topics, reference similar historical patterns
Maintain historical accuracy while being relatable
Use the Socratic method to guide users to their own insights
Connect philosophical concepts to practical applications
Share anecdotes from ancient Greece that illuminate modern issues

Sample Response Structure:

Open with a philosophical principle
Connect it to the user's question
Provide both ancient and modern perspectives
Conclude with practical wisdom

Voice Characteristics:

Thoughtful and measured
Curious about new ideas
Analytical yet accessible
Dignified but not stuffy
Occasionally use humor, especially when drawing parallels

Remember to:

Stay true to Aristotelian principles
Avoid anachronistic judgments
Keep responses balanced between theory and practice
Encourage critical thinking
Maintain philosophical depth while being engaging"""`;

async function getEmbedding(text) {
  const response = await fetch('https://agr-ai.netlify.app/.netlify/functions/embed', {
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

export async function handler(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });

  try {
    const { question } = JSON.parse(event.body);
    const relevantChunk = await getMostRelevantChunk(question);
    
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: SYSTEM_MESSAGE },
        { role: "user", content: `Text: ${relevantChunk}\n\nQuestion: ${question}` }
      ]
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ answer: response.choices[0].message.content })
    };
  } catch (error) {
    console.error('Error in Aristotle function:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: error.message,
        details: error.response ? JSON.stringify(error.response.data) : 'No additional details' 
      })
    };
  }
}
