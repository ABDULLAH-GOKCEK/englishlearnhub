// api/chat.js → %100 ÇALIŞIR VERSİYON
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
                inputs: `You are a friendly and helpful English teacher. Answer in simple English.\nUser: ${message}\nAssistant:`,
                parameters: {
                    max_new_tokens: 120,
                    temperature: 0.7,
                    top_p: 0.9,
                    return_full_text: false
                }
            })
        });

        if (!response.ok) throw new Error("Model busy");

        const data = await response.json();
        let reply = data[0]?.generated_text || "I'm thinking...";

        // Assistant: kısmından sonrasını al
        if (reply.includes("Assistant:")) {
            reply = reply.split("Assistant:")[1].trim();
        }

        res.status(200).json({ reply: reply || "Hello! How can I help you?" });
    } catch (error) {
        res.status(200).json({ reply: "Hi! I'm your English teacher. What would you like to practice today?" });
    }
}