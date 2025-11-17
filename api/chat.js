// api/chat.js → Hugging Face (KESİN ÇALIŞIR)
export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();

    const { message } = req.body;
    if (!message) return res.status(400).json({ reply: "Mesaj yaz!" });

    try {
        const response = await fetch("https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3", {
            headers: {
                "Authorization": "Bearer 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",
                "Content-Type": "application/json",
            },
            method: "POST",
            body: JSON.stringify({
                inputs: `You are a friendly English teacher. Answer in English, keep it short.\nUser: ${message}\nAssistant:`,
                parameters: { max_new_tokens: 80 }
            })
        });

        const data = await response.json();
        let reply = data[0]?.generated_text || "Sorry, I didn't understand.";
        reply = reply.split("Assistant:")[1]?.trim() || reply;

        res.status(200).json({ reply });
    } catch (e) {
        res.status(500).json({ reply: "Try again." });
    }
}