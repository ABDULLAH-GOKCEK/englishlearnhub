// api/chat.js → Hugging Face Mistral (KESİN ÇALIŞIR)
export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();

    const { message, role = "Genel İngilizce Öğretmeni" } = req.body;

    try {
        const response = await fetch("https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3", {
            method: "POST",
            headers: {
                "Authorization": "Bearer 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",
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                inputs: `${role}\n\nUser: ${message}\nAssistant:`,
                parameters: {
                    max_new_tokens: 150,
                    temperature: 0.7,
                    return_full_text: false
                }
            })
        });

        const data = await response.json();
        const reply = data[0]?.generated_text?.trim() || "Bir saniye, düşünemedim.";

        res.status(200).json({ reply });
    } catch (error) {
        console.error("HF Error:", error);
        res.status(500).json({ reply: "Biraz yavaşladım, tekrar dene." });
    }
}