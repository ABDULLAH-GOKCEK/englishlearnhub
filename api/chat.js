// api/chat.js
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { message, level = 'A1' } = req.body;
  if (!message) return res.status(400).json({ reply: 'Message required' });

  try {
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROK_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'grok-beta',
        messages: [
          { role: 'system', content: `You are a friendly English teacher for ${level} level. Keep answers short, simple, and in English.` },
          { role: 'user', content: message }
        ],
        max_tokens: 80
      })
    });

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content?.trim() || "I didn't understand.";

    res.status(200).json({ reply });
  } catch (error) {
    console.error('Grok AI Error:', error);
    res.status(500).json({ reply: 'I am having trouble. Try again!' });
  }
}