// AIanalyzeFile.js contains the function to analyze text blobs using OpenAI's API.
import dotenv from "dotenv";
dotenv.config();
const openaiKey = process.env.OPENAI_API_KEY;

export async function analyzeTextBlob(blob, fileName) {
  const text = await blob.text();
  const fileContent = await blob.text();
  const prompt = `
  You are an expert AI assistant.
  
  You have received a file named "${fileName}". Its contents (first 1500 characters) are provided below.
  
  Your task is to analyze the content intelligently. Depending on the type of the file (e.g., text document, programming code, report, or log), do the following:
  - If it's a text or report, summarize its key points and determine its purpose.
  - If it's a code file, explain what it does and check for potential problems or vulnerabilities.
  - If it's a log or data, detect anomalies, patterns, or errors worth mentioning.
  
  Here is the beginning of the file:\n\n${fileContent.slice(0, 1500)}\n\nRespond in markdown.
  `;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${openaiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await response.json();
  const message = data.choices?.[0]?.message?.content;
  return message;
}
