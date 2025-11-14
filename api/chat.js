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
                    { role: 'system', content: `You are a helpful English teacher for ${level} level. Answer in Turkish if user asks in Turkish. Keep it short.` },
                    { role: 'user', content: message }
                ],
                max_tokens: 100
            })
        });

        const data = await response.json();
        const reply = data.choices?.[0]?.message?.content?.trim() || "Anlamadım, tekrar dene.";

        res.status(200).json({ reply });
    } catch (error) {
        console.error(error);
        res.status(500).json({ reply: 'AI meşgul, lütfen bekle.' });
    }
}