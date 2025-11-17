// api/chat.js – 17 Kasım 2025 – %100 SOHBET DEVAM EDİYOR
export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();

    const { message } = req.body;
    if (!message) return res.status(400).json({ reply: "Mesaj yaz!" });

    try {
        const response = await fetch("https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3", {
            method: "POST",
            headers: {
                "Authorization": "Bearer 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",
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                inputs: `You are a friendly English teacher. Answer in simple English.\nUser: ${message}\nAssistant:`,
                parameters: {
                    max_new_tokens: 150,
                    temperature: 0.7,
                    top_p: 0.9,
                    return_full_text: false,   // BU SATIR ÇOK ÖNEMLİ!
                    stop: ["\nUser:", "User:", "\n"]  // Tekrarı kesin keser
                }
            })
        });

        const data = await response.json();
        let reply = data[0]?.generated_text || "Hmm, let me think...";

        // "Assistant:" kısmından sonrasını al
        if (reply.includes("Assistant:")) {
            reply = reply.split("Assistant:")[1].trim();
        }

        // Eğer boşsa veya çok kısaysa yedek cevap
        if (!reply || reply.length < 5) {
            reply = "Great question! Let's practice that together.";
        }

        res.status(200).json({ reply });
    } catch (error) {
        console.error(error);
        res.status(200).json({ reply: "Sorry, I'm a bit slow right now. Ask again!" });
    }
}