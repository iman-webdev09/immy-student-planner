export const config = { runtime: 'edge' };

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: cors });

export default async function handler(req) {
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const API_KEY = process.env.GROQ_API_KEY;
  if (!API_KEY) return json({ error: 'API key missing on Vercel' }, 500);

  let message, userTasks;
  try {
    ({ message, userTasks } = await req.json());
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const systemPrompt = `You are Immy, a friendly student assistant. The student is Iman. Speak in English/Roman Urdu. Keep it short. Tasks: ${userTasks || 'None'}`;

  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        temperature: 0.7,
        max_tokens: 150
      })
    });

    const data = await r.json();
    if (!r.ok) return json({ error: data.error?.message || 'Groq API Error' }, r.status);
    return json({ reply: data.choices[0].message.content });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}