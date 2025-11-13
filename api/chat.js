export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { message, level } = req.body;

  // ÜCRETSİZ AI (Hugging Face - Mistral)
  const response = await fetch('https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.1', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer hf_YOUR_TOKEN_HERE', // https://huggingface.co/settings/tokens
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputs: `You are a friendly English teacher for ${level} level. Respond in simple English. User: ${message}`,
      parameters: { max_new_tokens: 100 }
    })
  });

  const data = await response.json();
  const reply = data[0]?.generated_text?.split('User:')[0]?.trim() || "Sorry, I didn't understand.";

  res.status(200).json({ reply });
}