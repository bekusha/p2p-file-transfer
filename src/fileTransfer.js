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

// Reconstructs the full file from chunks and creates a download link.
function reconstructAndDisplayFile(file) {
  const { chunks, meta } = file;
  const totalSize = chunks.reduce((sum, c) => sum + c.length, 0);
  const fullFile = new Uint8Array(totalSize);

  let offset = 0;
  for (const chunk of chunks) {
    fullFile.set(chunk, offset);
    offset += chunk.length;
  }

  const blob = new Blob([fullFile], {
    type: meta.mime || "application/octet-stream",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = meta.name;
  link.innerText = `⬇️ Download ${meta.name}`;
  link.style.display = "block";
  link.style.marginTop = "20px";

  const chatScreen = document.getElementById("chatScreen");
  chatScreen?.appendChild(link);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
