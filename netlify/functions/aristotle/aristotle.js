// netlify/functions/aristotle.js
const OpenAI = require('openai');
const fetch = require('node-fetch');

// Simplified response when embeddings aren't available
const DEFAULT_RESPONSE = `I am Aristotle, and I'll draw from my general knowledge to answer your question.`;

let embeddingsCache = null;

async function loadAllEmbeddings() {
  if (embeddingsCache) return embeddingsCache;

  const embeddings = {};
  const baseUrl = 'https://raw.githubusercontent.com/adampao/politics-embeddings/main/';
  const files = Array.from({length: 8}, (_, i) => `embeddings_chunk_${i + 1}.json`);

  for (const file of files) {
    try {
      const response = await fetch(`${baseUrl}${file}`);
      const chunks = await response.json();
      chunks.forEach(chunk => {
        embeddings[chunk.text] = chunk.vector;
      });
    } catch (error) {
      console.error(`Error loading ${file}:`, error);
    }
  }

  embeddingsCache = embeddings;
  return embeddings;
}

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

// Function to load embeddings from GitHub
async function loadEmbeddingsFromGitHub() {
  const embeddings = {};
  
  // IMPORTANT: Replace with YOUR GitHub username and repository name
  const baseUrl = 'https://raw.githubusercontent.com/adampao/politics-embeddings/main/';
  
  // List ALL your chunk filenames exactly as they appear in the GitHub repository
  const chunkFiles = [
    'embeddings_chunk_1.json',
    'embeddings_chunk_2.json',
    'embeddings_chunk_3.json',
    'embeddings_chunk_4.json',
    'embeddings_chunk_5.json',
    'embeddings_chunk_6.json',
    'embeddings_chunk_7.json',
    'embeddings_chunk_8.json',
    // Add ALL your chunk filenames here
    // Example: 'embeddings_chunk_3.json', 'embeddings_chunk_4.json', etc.
  ];

  for (const filename of chunkFiles) {
    try {
      const response = await nodeFetch(`${baseUrl}${filename}`);
      const chunks = await response.json();
      
      chunks.forEach(chunk => {
        embeddings[chunk.text] = chunk.vector;
      });
    } catch (error) {
      console.error(`Error loading chunk ${filename}:`, error);
    }
  }

  return embeddings;
}

// Initialize embeddings
let embeddings = {};
let chunks = [];

async function initializeEmbeddings() {
  embeddings = await loadEmbeddingsFromGitHub();
  chunks = Object.keys(embeddings);
}

async function getMostRelevantChunk(question) {
  const embeddings = await loadEmbeddingsFromGitHub();
  const chunks = Object.keys(embeddings);
  
  if (chunks.length === 0) {
    return "I apologize, but I am having trouble accessing my knowledge base at the moment. Let me answer based on my general knowledge.";
  }

  // Simple keyword matching as fallback
  const keywords = question.toLowerCase().split(' ');
  let bestChunk = chunks[0];
  let bestScore = 0;

  chunks.forEach(chunk => {
    const score = keywords.filter(word => 
      chunk.toLowerCase().includes(word)
    ).length;
    
    if (score > bestScore) {
      bestScore = score;
      bestChunk = chunk;
    }
  });

  return bestChunk;
}
  

  // Create an embedding for the question using an external service
  let questionEmbedding;
  try {
    const response = await nodeFetch('https://agr-ai.netlify.app/.netlify/functions/embed', {
      method: 'POST',
      body: JSON.stringify({ text: question })
    });
    const data = await response.json();
    questionEmbedding = data.embedding;
  } catch (error) {
    console.error('Error getting question embedding:', error);
    // Fallback to the first chunk if embedding fails
    return chunks[0];
  }

  // Find most relevant chunk using cosine similarity
  let maxSimilarity = -Infinity;
  let mostRelevantChunk = chunks[0];

  for (const chunk of chunks) {
    const similarity = cosineSimilarity(questionEmbedding, embeddings[chunk]);
    if (similarity > maxSimilarity) {
      maxSimilarity = similarity;
      mostRelevantChunk = chunk;
    }
  }
  return mostRelevantChunk;


function cosineSimilarity(a, b) {
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dotProduct / (magnitudeA * magnitudeB);
}

exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  try {
    const embeddings = await loadAllEmbeddings();
    const { question } = JSON.parse(event.body);

    // Find relevant text
    const chunks = Object.keys(embeddings);
    const relevantText = chunks.find(chunk => 
      chunk.toLowerCase().includes(question.toLowerCase())
    ) || chunks[0];

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: "You are Aristotle. Use the provided text from Politics to inform your answers." },
        { role: "user", content: `Context: ${relevantText}\n\nQuestion: ${question}` }
      ]
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ answer: response.choices[0].message.content })
    };
  } catch (error) {
    console.error('Error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};