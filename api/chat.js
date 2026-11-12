export const config = { runtime: 'edge' };

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: cors });

// Pehla model na chale to agla try hoga
const MODELS = [
  'llama-3.1-8b-instant',
  'openai/gpt-oss-20b',
  'llama-3.3-70b-versatile',
  'openai/gpt-oss-120b'
];

export default async function handler(req) {
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const API_KEY = process.env.GROQ_API_KEY;
  if (!API_KEY) return json({ error: 'API key missing on Vercel' }, 500);

  let message, userTasks, userName;
  try {
    ({ message, userTasks, userName } = await req.json());
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  if (!message || typeof message !== 'string') return json({ error: 'Message missing' }, 400);
  message = message.slice(0, 1000);
  userTasks = String(userTasks || '').slice(0, 1500);
  const name = String(userName || '').replace(/[^\p{L}\p{N} ]/gu, '').trim().slice(0, 30);

  const systemPrompt = `You are Immy, a friendly student assistant. ${name ? `The student's name is ${name}.` : ''} Speak in English/Roman Urdu. Keep it short. Tasks: ${userTasks || 'None'}`;

  let lastError = 'Groq API Error';

  for (const model of MODELS) {
    try {
      const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: message }
          ],
          temperature: 0.7,
          max_tokens: 400
        })
      });

      const data = await r.json();

      if (r.ok) {
        const reply = data.choices?.[0]?.message?.content;
        if (reply && reply.trim()) return json({ reply });
        lastError = `Model ${model} ne khali jawab diya`;
        continue;
      }

      lastError = data.error?.message || `Groq error ${r.status}`;

      // Model ka masla ho to agla model try karo, warna ruk jao
      const msg = lastError.toLowerCase();
      const modelProblem = msg.includes('model') || r.status === 404;
      if (!modelProblem) return json({ error: lastError }, r.status);
    } catch (e) {
      lastError = e.message;
    }
  }

  return json({ error: lastError }, 500);
}