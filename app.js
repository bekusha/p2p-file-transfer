// app.js
import { getTopicHex, createRoom, joinRoom } from "./src/peer.js";

// For hot reloading
Pear.updates(() => Pear.reload());

const elements = {
  createButton: document.getElementById("createRoom"),
  joinButton: document.getElementById("joinRoom"),
  topicInput: document.getElementById("peer-id"),
  status: document.getElementById("connectStatus"),
  localId: document.getElementById("localId"),
  copyIdButton: document.getElementById("copyId"),
};

// Update status text in the UI
function updateStatus(message) {
  if (elements.status) {
    elements.status.innerText = message;
  }
}

// Handle incoming messages from peers
function handleIncomingMessage(name, message, connection) {
  const text = message;
  updateStatus(`📨 Message from ${name}: ${text}`);

  if (text.trim() === "Hello") {
    connection.write(Buffer.from("👋 Hello from receiver!"));
  }
}

// Copy the current room topic to clipboard
function copyLocalId() {
  navigator.clipboard
    .writeText(getTopicHex())
    .then(() => alert("✅ Topic copied!"))
    .catch(() => alert("❌ Failed to copy."));
}

//  Create a new room and join it
async function handleCreateRoom() {
  try {
    await createRoom(handleIncomingMessage);
    const topic = getTopicHex();
    elements.localId.innerText = topic;
    updateStatus(`🛜 Room created! Waiting for peers...`);
    await joinRoom(topic, handleIncomingMessage);
  } catch (error) {
    updateStatus("❌ Error: Could not create or join room." + error);
  }
}

// Join an existing room by topic
async function handleJoinRoom() {
  const topic = elements.topicInput.value.trim();
  if (!topic) {
    alert("❌ Please enter a topic.");
    return;
  }

  try {
    await joinRoom(topic, handleIncomingMessage);
    updateStatus(`🔍 Joined and connected to topic: ${topic}`);
  } catch (error) {
    updateStatus("❌ Error: Could not join room." + error);
  }
}

// Setup event listeners for UI actions
function setupEventListeners() {
  elements.createButton.addEventListener("click", handleCreateRoom);
  elements.joinButton.addEventListener("click", handleJoinRoom);
  elements.copyIdButton?.addEventListener("click", copyLocalId);
}

function startApp() {
  setupEventListeners();
}

startApp();
