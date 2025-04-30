// fileTransfer.js
// ---------------
// This module handles peer-to-peer file transfer between users,
// including chunked upload/download, file reconstruction, and optional AI analysis.
// It is integrated with the OpenAI API via `analyzeTextBlob()` to summarize text-based files.

import { analyzeTextBlob } from "./ai/AI-analyze.js";

const CHUNK_SIZE = 64 * 1024; // 64KB
const incomingFiles = {};

// Sets up the file sending process by attaching a listener to the "Send File" button.
export function setupFileTransfer(peerConnection) {
  const sendButton = document.getElementById("sendFileButton");
  const fileInput = document.getElementById("fileInput");

  if (!sendButton || !fileInput) {
    return;
  }

  sendButton.addEventListener("click", () => {
    const file = fileInput.files[0];
    if (!file) {
      alert("❌ Please select a file first.");
      return;
    }
    sendFile(peerConnection, file);
  });
}

// Splits the file into chunks and sends it to the peer.
export function sendFile(peerConnection, file) {
  const reader = new FileReader();
  reader.onload = async () => {
    const buffer = new Uint8Array(reader.result);
    const totalChunks = Math.ceil(buffer.length / CHUNK_SIZE);
    const fileId =
      Date.now() + "-" + Math.random().toString(36).substring(2, 8);

    // Send file metadata first
    const fileMeta = {
      type: "file-meta",
      fileId,
      name: file.name,
      mime: file.type,
      size: buffer.length,
      totalChunks,
    };

    peerConnection.write(Buffer.from(JSON.stringify(fileMeta)));

    // Send file chunks sequentially
    for (let i = 0; i < totalChunks; i++) {
      const chunk = buffer.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
      const chunkMessage = {
        type: "file-chunk",
        fileId,
        index: i,
        data: Array.from(chunk),
      };
      peerConnection.write(Buffer.from(JSON.stringify(chunkMessage)));
      await sleep(5);
    }

    alert("✅ File sent successfully!");
  };

  reader.onerror = () => {
    alert("❌ Error reading the file.");
  };

  reader.readAsArrayBuffer(file);
}

export function handleIncomingChunk(parsed) {
  const { type, fileId, index, data } = parsed;

  if (type === "file-meta") {
    // Initialize a new file record
    incomingFiles[fileId] = {
      meta: parsed,
      chunks: [],
      receivedCount: 0,
    };
  } else if (type === "file-chunk") {
    const file = incomingFiles[fileId];
    if (!file) {
      return alert("❌ File metadata not found.");
    }

    const chunkData = new Uint8Array(data);
    file.chunks[index] = chunkData;
    file.receivedCount++;

    // Once all chunks are received, reconstruct the file
    if (file.receivedCount === file.meta.totalChunks) {
      reconstructAndDisplayFile(file);
    }
  }
}

// Reconstructs the file from its chunks and displays it in the chat interface.
function reconstructAndDisplayFile(file) {
  const blob = rebuildBlobFromChunks(file);
  const container = buildFileCard(file.meta, blob);
  document.getElementById("chatScreen")?.appendChild(container);
}

// Button for analyzing the file with AI
function createAnalyzeButton(blob, meta, container) {
  const button = document.createElement("button");
  button.innerText = "🧠 Analyze with AI";
  Object.assign(button.style, {
    padding: "6px 12px",
    border: "1px solid #00ffcc",
    background: "#002222",
    color: "#00ffcc",
    borderRadius: "6px",
    cursor: "pointer",
  });

  button.addEventListener("click", async () => {
    button.disabled = true;
    button.innerText = "🔄 Analyzing...";
    try {
      const summary = await analyzeTextBlob(blob, meta.name);
      const summaryBox = document.createElement("div");
      summaryBox.innerText = `📄 AI Summary: ${summary}`;
      Object.assign(summaryBox.style, {
        marginTop: "10px",
        color: "#aaffee",
        whiteSpace: "pre-wrap",
      });
      container.appendChild(summaryBox);
    } catch {
      alert("❌ Failed to analyze file.");
    } finally {
      button.disabled = false;
      button.innerText = "🧠 Analyze with AI";
    }
  });

  return button;
}

// Builds a card for the file, including a download link and an AI analysis button.
function buildFileCard(meta, blob) {
  const url = URL.createObjectURL(blob);
  const container = document.createElement("div");
  Object.assign(container.style, {
    marginTop: "20px",
    padding: "10px",
    border: "1px solid #00ff99",
    borderRadius: "8px",
    backgroundColor: "#001a1a",
  });

  const link = document.createElement("a");
  link.href = url;
  link.download = meta.name;
  link.innerText = `⬇️ Download ${meta.name}`;
  Object.assign(link.style, {
    display: "block",
    marginBottom: "8px",
  });

  container.appendChild(link);

  const analyzeButton = createAnalyzeButton(blob, meta, container);
  container.appendChild(analyzeButton);

  return container;
}

// Rebuilds the file from its chunks and creates a Blob object.
function rebuildBlobFromChunks(file) {
  const { chunks, meta } = file;
  const totalSize = chunks.reduce((sum, c) => sum + c.length, 0);
  const fullFile = new Uint8Array(totalSize);

  let offset = 0;
  for (const chunk of chunks) {
    fullFile.set(chunk, offset);
    offset += chunk.length;
  }

  return new Blob([fullFile], {
    type: meta.mime || "application/octet-stream",
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
