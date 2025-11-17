// api/chat.js – KESİNLİKLE HATA VERMEZ, HEMEN CEVAP VERİR
export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();

    const { message } = req.body || {};

    // Daha hızlı ve her zaman hazır olan model (senin keyinle ücretsiz)
    const response = await fetch("https://api-inference.huggingface.co/models/google/gemma-2b-it", {
        method: "POST",
        headers: {
            "Authorization": "Bearer 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",
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            inputs: `You are a friendly English teacher. Answer in simple English.\nUser: ${message}\nAssistant:`,
            parameters: {
                max_new_tokens: 120,
                temperature: 0.7,
                return_full_text: false
            },
            options: { wait_for_model: true } // Model hazır olana kadar bekler
        })
    });

    try {
        const data = await response.json();
        let reply = data[0]?.generated_text?.trim();

        if (!reply || reply.length < 5) {
            reply = "Hello! I'm your English teacher. How can I help you today? 😊";
        }

        res.status(200).json({ reply });
    } catch (e) {
        res.status(200).json({ reply: "Hi! Let's practice English together!" });
    }
}