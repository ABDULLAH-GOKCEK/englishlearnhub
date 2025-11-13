// api/chat.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message, level = 'A1' } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    const response = await fetch('https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.1', {
      method: 'POST',
      headers: {
        'Authorization': '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', // BURAYA HUGGING FACE TOKENINI YAZ
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: `You are a friendly English teacher for ${level} level. Keep responses short, simple, and in English. User: ${message}`,
        parameters: { max_new_tokens: 80, temperature: 0.7 }
      })
    });

    const data = await response.json();
    let reply = data[0]?.generated_text || "Sorry, I didn't understand.";

    // Temizle: Kullanıcı mesajını çıkar
    reply = reply.split('User:')[0].trim();
    reply = reply.replace(/Assistant:|\[INST\].*/g, '').trim();

    res.status(200).json({ reply });
  } catch (error) {
    console.error('AI Error:', error);
    res.status(500).json({ reply: "I'm having trouble connecting. Try again!" });
  }
}