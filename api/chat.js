export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message, userTasks } = req.body;
  const API_KEY = process.env.GROQ_API_KEY; 

  if (!API_KEY) {
    return res.status(500).json({ error: 'API key missing' });
  }

  const systemPrompt = `You are Immy, a friendly student assistant. The student is Iman. Speak in English/Roman Urdu. Keep it short. Tasks: ${userTasks || 'None'}`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "llama3-8b-8192",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ],
        temperature: 0.7,
        max_tokens: 150
      })
    });

    const data = await response.json();
    res.status(200).json({ reply: data.choices[0].message.content });
  } catch (error) {
    res.status(500).json({ error: 'Failed to connect' });
  }
}