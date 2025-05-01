# 🛰️ P2P File Transfer with AI Analysis

This is a peer-to-peer (P2P) file transfer desktop application built with [Pear Runtime](https://docs.pears.com/), allowing users to send and receive files directly without servers. After transfer, text files can be analyzed using the OpenAI API to generate AI-powered summaries.

---

## 🧱 Built With

- 🧪 Vanilla JavaScript (ES6+)
- 🖥️ HTML + CSS
- 🧠 OpenAI API
- 🌐 Pear Runtime (P2P App Platform)

## 🚀 Features

- ⚡ Real-time file sharing over a P2P network
- 📦 Chunked upload/download system
- 📈 UI progress bar for file transfer
- 🛑 Transfer cancellation support
- 🧠 One-click "Analyze with AI" for received files

---

## 🧰 Requirements

- Node.js ≥ 18
- [Pear Runtime](https://docs.pears.com/)
- OpenAI API key

---

## 🛠️ Setup

# 1. Install dependencies (if any)

npm install

# 2. Add your OpenAI key to `.env`

echo "OPENAI_API_KEY=your-key-here" > .env

# 3. Start the application with Pear

pear dev

## 📦 Production Deployment via Pear Seed

You can run the app directly in production mode using the Pear Seed:

pear run pear://psheiwf4rp7r1epmcsge8ecddk5undnks9di19kaeym4znkspzwy
