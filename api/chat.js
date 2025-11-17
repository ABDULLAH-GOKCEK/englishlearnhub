// api/chat.js
export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();

    const apiKey = process.env.GROK_API_KEY;
    if (!apiKey) {
        console.error('GROK_API_KEY eksik!');
        return res.status(500).json({ reply: 'API key eksik.' });
    }

    const { message, level = 'A1' } = req.body;

    try {
        const response = await fetch('https://api.x.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'grok-beta',
                messages: [
                    { role: 'system', content: 'You are a friendly English teacher. Answer in English. Keep it short.' },
                    { role: 'user', content: message }
                ],
                max_tokens: 100
            })
        });

        if (!response.ok) throw new Error(`Grok API error: ${response.status}`);

        const data = await response.json();
        const reply = data.choices?.[0]?.message?.content?.trim() || "Sorry, I didn't understand.";

        res.status(200).json({ reply });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ reply: 'AI is busy. Please try again.' });
    }
}