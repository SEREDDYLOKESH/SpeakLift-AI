const express = require('express');
const cors = require('cors');
require('dotenv').config();
const Groq = require('groq-sdk');

const app = express();
app.use(cors());
app.use(express.json());

const port = process.env.PORT || 5000;

// Store conversation history per user (in-memory, keyed by userId)
const conversations = {};

app.post('/api/chat', async (req, res) => {
  const { text, userId = 'default_user', apiKey } = req.body;

  if (!text) {
    return res.status(400).json({ error: 'Text is required' });
  }

  // Prefer the user-supplied key, fall back to server .env key
  const keyToUse = apiKey || process.env.GROQ_API_KEY;

  if (!keyToUse || keyToUse === 'your_groq_api_key_here') {
    return res.status(401).json({
      error: 'no_api_key',
      message: 'No API key provided. Please enter your Groq API key in the settings.',
    });
  }

  // Create a per-request Groq client with the user's key
  const groq = new Groq({ apiKey: keyToUse });

  if (!conversations[userId]) {
    conversations[userId] = [
      {
        role: 'system',
        content: `You are an expert English speaking coach and voice assistant.
Your goal is to converse with the user naturally while helping them improve their spoken English.

When the user speaks, you must output a raw JSON object with exactly the following fields:
"corrected_sentence": The grammatically correct version of what they said. If no correction is needed, leave it blank ("").
"explanation": Simply explain any mistakes they made in simple English. If no mistakes, leave it blank ("").
"suggestion": Suggest better vocabulary or phrasing for what they tried to say. If no suggestion, leave it blank ("").
"response": Your natural, human-like voice response to keep the conversation flowing. Ask follow-up questions, encourage them, keep it short and clear. Always respond in English.

Important rule: Output ONLY the valid JSON object, no markdown code blocks, no extra text, no backticks.`,
      },
    ];
  }

  const history = conversations[userId];
  history.push({ role: 'user', content: text });

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: history,
      temperature: 0.7,
      max_tokens: 512,
    });

    const aiMessage = completion.choices[0].message.content;

    let parsedResponse = {};
    try {
      const cleaned = aiMessage.replace(/```json|```/g, '').trim();
      parsedResponse = JSON.parse(cleaned);
    } catch (e) {
      console.error('Failed to parse AI response as JSON:', aiMessage);
      parsedResponse = {
        corrected_sentence: '',
        explanation: '',
        suggestion: '',
        response: aiMessage,
      };
    }

    history.push({ role: 'assistant', content: parsedResponse.response || aiMessage });
    res.json(parsedResponse);
  } catch (error) {
    console.error('Error with Groq API:', error);
    // Send a user-friendly error code back to the frontend
    const status = error.status || 500;
    res.status(status).json({ error: 'api_error', message: error.message });
  }
});

app.listen(port, () => {
  console.log(`Backend listening on port ${port}`);
});
