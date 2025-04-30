// AIanalyzeFile.js contains the function to analyze text blobs using OpenAI's API.
import dotenv from 'dotenv';
dotenv.config();
const openaiKey = process.env.OPENAI_API_KEY;

export async function analyzeTextBlob(blob, fileName) {
  const text = await blob.text();
  const prompt = `Analyze the file "${fileName}" with the following text:\n\n${text.slice(
    0,
    1500,
  )}...`;
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${openaiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    }),
  });
  const data = await response.json();
  const message = data.choices?.[0]?.message?.content;
  return message;
}
