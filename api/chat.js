// api/chat.js
export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();

    const apiKey = process.env.GROK_API_KEY;
    if (!apiKey || apiKey.trim() === '') {
        console.error('GROK_API_KEY eksik veya boş!');
        return res.status(500).json({ reply: 'API key eksik.' });
    }

    const { message, level = 'A1' } = req.body;

    try {
        const response = await fetch('https://api.x.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey.trim()}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'grok-beta',
                messages: [
                    { role: 'system', content: `You are a friendly English teacher for ${level} level. Answer in English. Keep it short.` },
                    { role: 'user', content: message }
                ],
                max_tokens: 100,
                temperature: 0.7
            })
        });

        if (!response.ok) {
            const err = await response.text();
            console.error('Grok API error:', response.status, err);
            return res.status(500).json({ reply: 'AI is busy. Please try again.' });
        }

        const data = await response.json();
        const reply = data.choices?.[0]?.message?.content?.trim() || "Sorry, I didn't understand.";

        res.status(200).json({ reply });
    } catch (error) {
        console.error('Catch error:', error);
        res.status(500).json({ reply: 'AI is busy. Please try again.' });
    }
}