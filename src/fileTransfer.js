// fileTransfer.js
// ---------------
// This module handles peer-to-peer file transfer between users,
// including chunked upload/download, file reconstruction, and optional AI analysis.
// It is integrated with the OpenAI API via `analyzeTextBlob()` to summarize text-based files.

import { analyzeTextBlob } from "./ai/AI-analyze.js";

const CHUNK_SIZE = 64 * 1024; // 64KB
const incomingFiles = {};

function getProgressUI() {
  return {
    progressContainer: document.getElementById("progressContainer"),
    progressBar: document.getElementById("progressBar"),
    progressLabel: document.getElementById("progressLabel"),
    cancelButton: document.getElementById("cancelButton"),
    sendButton: document.getElementById("sendFileButton"),
    fileInput: document.getElementById("fileInput"),
    chatScreen: document.getElementById("chatScreen"),
  };
}

// Sets up the file sending process by attaching a listener to the "Send File" button.
export function setupFileTransfer(peerConnection) {
  const { sendButton, fileInput } = getProgressUI();

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
  let isCancelled = false;

  const reader = new FileReader();
  reader.onload = async () => {
    const buffer = new Uint8Array(reader.result);
    const totalChunks = Math.ceil(buffer.length / CHUNK_SIZE);
    const fileId =
      Date.now() + "-" + Math.random().toString(36).substring(2, 8);

    // UI elements
    const { progressContainer, progressBar, progressLabel, cancelButton } =
      getProgressUI();
    progressContainer.style.display = "block";
    cancelButton.style.display = "inline-block";
    progressBar.value = 0;
    progressBar.max = totalChunks;
    progressLabel.innerText = "0%";

    cancelButton.onclick = () => {
      isCancelled = true;
      progressContainer.style.display = "none";
      cancelButton.style.display = "none";
      alert("❌ Transfer cancelled.");
      return;
    };

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
      if (isCancelled) {
        return;
      }
      const chunk = buffer.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
      const chunkMessage = {
        type: "file-chunk",
        fileId,
        index: i,
        data: Array.from(chunk),
      };
      requestAnimationFrame(() => {
        if (isCancelled) return;
        progressBar.value = i + 1;
        progressLabel.innerText = `${Math.round(((i + 1) / totalChunks) * 100)}%`;
      });

      peerConnection.write(Buffer.from(JSON.stringify(chunkMessage)));
      await sleep(5);
    }
    if (!isCancelled) {
      requestAnimationFrame(() => {
        if (progressLabel) progressLabel.innerText = "✅ File is sent";
        if (cancelButton) cancelButton.style.display = "none";
        setTimeout(() => {
          if (progressContainer) progressContainer.style.display = "none";
        }, 2000);
      });
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

    // Initialize receiver progress bar
    const { progressContainer, progressBar, progressLabel, cancelButton } =
      getProgressUI();
    progressContainer.style.display = "block";
    cancelButton.style.display = "none";

    progressBar.value = 0;
    progressBar.max = parsed.totalChunks;
    progressLabel.innerText = "0%";
  } else if (type === "file-chunk") {
    const file = incomingFiles[fileId];
    if (!file) {
      return alert("❌ File metadata not found.");
    }

    const chunkData = new Uint8Array(data);
    file.chunks[index] = chunkData;
    file.receivedCount++;

    requestAnimationFrame(() => {
      const { progressBar, progressLabel } = getProgressUI();

      progressBar.value = file.receivedCount;
      progressLabel.innerText = `${Math.round(
        (file.receivedCount / file.meta.totalChunks) * 100
      )}%`;
    });

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
  const { progressContainer, progressLabel, cancelButton, chatScreen } =
    getProgressUI();
  chatScreen?.appendChild(container);

  if (progressLabel) progressLabel.innerText = "✅ File is downloaded";
  if (cancelButton) cancelButton.style.display = "none";
  if (progressContainer) {
    setTimeout(() => {
      progressContainer.style.display = "none";
    }, 2000); // hides after 2s for smoother UX
  }
}

// Button for analyzing the file with AI
function createAnalyzeButton(blob, meta, container) {
  const button = document.createElement("button");
  button.innerText = "🧠 Analyze with AI";
  button.className = "analyze-button";

  button.addEventListener("click", async () => {
    button.disabled = true;
    button.innerText = "🔄 Analyzing...";
    try {
      // Shows Ai analysis in the chat
      const summary = await analyzeTextBlob(blob, meta.name);
      const summaryBox = document.createElement("div");
      summaryBox.innerText = `📄 AI Summary: ${summary}`;
      summaryBox.className = "ai-summary-box";
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
  container.className = "file-card";

  const link = document.createElement("a");
  link.href = url;
  link.download = meta.name;
  link.innerText = `⬇️ Download ${meta.name}`;
  link.className = "file-download-link";

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
