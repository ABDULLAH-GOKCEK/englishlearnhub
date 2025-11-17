// api/chat.js → Hugging Face ile çalışır (Grok’a gerek yok)
export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();

    const { message } = req.body;
    if (!message) return res.status(400).json({ reply: "Mesaj yaz!" });

    try {
        const response = await fetch("https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3", {
            method: "POST",
            headers: {
                "Authorization": `Bearer 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`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                inputs: `You are a friendly English teacher. Answer in English, keep it short and simple.\nUser: ${message}\nAssistant:`,
                parameters: { max_new_tokens: 100, temperature: 0.7 }
            })
        });

        const data = await response.json();
        let reply = data[0]?.generated_text || "Sorry, I didn't understand.";

        // "Assistant:" kısmından sonrasını al
        reply = reply.split("Assistant:")[1]?.trim() || reply;

        res.status(200).json({ reply });
    } catch (error) {
        console.error(error);
        res.status(500).json({ reply: "AI is busy, try again." });
    }
}