// api/chat.js
export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();

    const { message, level = 'A1' } = req.body;
    if (!message) return res.status(400).json({ reply: 'Mesaj gerekli' });

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
                    { role: 'system', content: `You are a friendly English teacher for ${level} level. Answer in English. Keep it short and simple.` },
                    { role: 'user', content: message }
                ],
                max_tokens: 80,
                temperature: 0.7
            })
        });

        if (!response.ok) throw new Error(`Grok API error: ${response.status}`);

        const data = await response.json();
        const reply = data.choices?.[0]?.message?.content?.trim();

        res.status(200).json({ reply: reply || "I didn't understand. Can you try again?" });
    } catch (error) {
        console.error('Grok API Error:', error);
        res.status(500).json({ reply: 'AI is busy. Please try again.' });
    }
}