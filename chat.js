export const config = { runtime: 'edge' };
export default async function handler(req, res) {
  // CORS Headers (Taake browser se request block na ho)
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message, userTasks } = req.body;
  const API_KEY = process.env.GROQ_API_KEY;

  if (!API_KEY) {
    return res.status(500).json({ error: 'API key missing on Vercel' });
  }

  const systemPrompt = `You are Immy, a friendly student assistant. The student is Iman. Speak in English/Roman Urdu. Keep it short. Tasks: ${userTasks || 'None'}`;

  try {
    // Groq API ko request bheji ja rahi hai
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile", // Groq ka sab se latest aur best model
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ],
        temperature: 0.7,
        max_tokens: 150
      })
    });

    const data = await response.json();

    // Agar Groq ki taraf se koi error aaye (jese key galat ho)
    if (!response.ok) {
      return res.status(response.status).json({ error: data.error ? data.error.message : 'Groq API Error' });
    }

    // Agar sab theek ho, toh AI ka jawab wapis bhej do
    res.status(200).json({ reply: data.choices[0].message.content });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}