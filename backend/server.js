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

// ── System prompt ─────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are an expert English speaking coach and voice assistant.
Your goal is to converse with the user naturally while helping them improve their spoken English.

STRICT OUTPUT FORMAT — you MUST always respond with ONLY this JSON object, nothing else:
{
  "corrected_sentence": "<grammatically correct version of what user said, OR empty string if perfect>",
  "explanation": "<simple explanation of mistakes, OR empty string if none>",
  "suggestion": "<better vocabulary or phrasing suggestion, OR empty string if none>",
  "response": "<your short, friendly, natural reply to keep the conversation going>"
}

RULES (never break these):
1. Output ONLY the raw JSON object above. No markdown, no backticks, no extra text before or after.
2. The "response" field must ONLY contain your conversational reply — not the JSON itself.
3. Keep "response" short (1-3 sentences). Ask follow-up questions to keep conversation flowing.
4. Always respond in English only.`;

// ── Reminder injected every N turns to prevent model drift ───────────────────
const REMINDER = `Remember: respond ONLY with a raw JSON object in this exact format:
{"corrected_sentence":"...","explanation":"...","suggestion":"...","response":"..."}
No extra text, no markdown, no backticks.`;

const REMINDER_EVERY_N_TURNS = 4; // inject reminder every 4 user messages

// ── Robust JSON extractor ─────────────────────────────────────────────────────
function extractJSON(raw) {
  // 1. Strip markdown fences
  let cleaned = raw.replace(/```json|```/gi, '').trim();

  // 2. Try direct parse
  try { return JSON.parse(cleaned); } catch (_) {}

  // 3. Find the first { ... } block
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    try { return JSON.parse(cleaned.slice(start, end + 1)); } catch (_) {}
  }

  // 4. Fallback: use raw text as the response
  // If there's text BEFORE the JSON, use that as the response
  const textBeforeJson = start !== -1 ? cleaned.slice(0, start).trim() : cleaned;
  return {
    corrected_sentence: '',
    explanation: '',
    suggestion: '',
    response: textBeforeJson || cleaned,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
app.post('/api/chat', async (req, res) => {
  const { text, userId = 'default_user', apiKey } = req.body;

  if (!text) return res.status(400).json({ error: 'Text is required' });

  const keyToUse = apiKey || process.env.GROQ_API_KEY;
  if (!keyToUse || keyToUse === 'your_groq_api_key_here') {
    return res.status(401).json({
      error: 'no_api_key',
      message: 'No API key provided. Please enter your Groq API key in the settings.',
    });
  }

  const groq = new Groq({ apiKey: keyToUse });

  // Init conversation with system prompt
  if (!conversations[userId]) {
    conversations[userId] = {
      history: [{ role: 'system', content: SYSTEM_PROMPT }],
      turnCount: 0,
    };
  }

  const convo = conversations[userId];
  convo.turnCount++;

  // Inject reminder every N turns to prevent drift
  if (convo.turnCount > 1 && convo.turnCount % REMINDER_EVERY_N_TURNS === 0) {
    convo.history.push({ role: 'system', content: REMINDER });
  }

  convo.history.push({ role: 'user', content: text });

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: convo.history,
      temperature: 0.5,       // lower = more consistent formatting
      max_tokens: 400,
      response_format: { type: 'json_object' }, // force JSON mode
    });

    const aiMessage = completion.choices[0].message.content;
    const parsed = extractJSON(aiMessage);

    // Only store the conversational reply in history (not the JSON blob)
    convo.history.push({
      role: 'assistant',
      content: parsed.response || aiMessage,
    });

    res.json(parsed);
  } catch (error) {
    console.error('Error with Groq API:', error);
    const status = error.status || 500;
    res.status(status).json({ error: 'api_error', message: error.message });
  }
});

app.listen(port, () => {
  console.log(`Backend listening on port ${port}`);
});
