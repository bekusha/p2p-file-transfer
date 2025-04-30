import { getTopicHex, createRoom, joinRoom, disconnectPeer } from './src/peer.js';
import { setupFileTransfer, handleIncomingChunk } from './src/fileTransfer.js';
import { join } from 'path';
Pear.updates(() => Pear.reload());

// Message types exchanged between peers
const MESSAGE_TYPES = {
  CONNECTED: '__CONNECTED__',
  FILE_META: 'file-meta',
  FILE_CHUNK: 'file-chunk',
};
// UI elements
const UI = {
  createButton: document.getElementById('createRoom'),
  joinButton: document.getElementById('joinRoom'),
  topicInput: document.getElementById('peer-id'),
  chatStatus: document.getElementById('chatStatus'),
  sendFileButton: document.getElementById('sendFileButton'),
  fileTransferUI: document.getElementById('fileTransferUI'),
  chatScreen: document.getElementById('chatScreen'),
  mainUI: document.getElementById('mainUI'),
  loadingScreen: document.getElementById('loadingScreen'),
  roomCodeValue: document.getElementById('roomCodeValue'),
  leaveChatButton: document.getElementById('leaveChatButton'),
  copyRoomCodeButton: document.getElementById('copyRoomCodeButton'),
};

let userRole = '';
let roomCode = '';
let currentConnection = null;
let joinTimeout = null;
let isConnected = false;

//  Displays the chat screen and hides other UI views.
//  Updates the room code and connection status for display.
function showChatScreen() {
  UI.mainUI.style.display = 'none';
  UI.loadingScreen.style.display = 'none';
  UI.chatScreen.style.display = 'block';

  UI.roomCodeValue.innerText = roomCode;
  // on clients side chatscreen opens when the server is connected
  UI.chatStatus.innerText =
    userRole === 'server' ? '⏳ Waiting for your peer to connect...' : '⏳ Connecting...';
}

// Loading Screen
function showLoading() {
  UI.mainUI.style.display = 'none';
  UI.chatScreen.style.display = 'none';
  UI.loadingScreen.style.display = 'block';
}

function hideLoading() {
  UI.loadingScreen.style.display = 'none';
}

function setupLeaveButton() {
  UI.leaveChatButton.addEventListener('click', handleDisconnect);
}
// disconnect connection
function handleDisconnect() {
  disconnectPeer();
  isConnected = false;
  UI.chatScreen.style.display = 'none';
  UI.mainUI.style.display = 'block';
}

// Copy Room Code Button
function setupCopyButton() {
  UI.copyRoomCodeButton?.addEventListener('click', () => {
    navigator.clipboard
      .writeText(UI.roomCodeValue.innerText)
      .then(() => alert('✅ Room Code copied!'))
      .catch(() => alert('❌ Failed to copy Room Code.'));
  });
}

//  Handles all messages received from the peer connection.
// Routes the message to the appropriate handler based on its type.
function handleIncomingMessage(name, message, connection) {
  currentConnection = connection;
  const text = message.toString();

  if (text === MESSAGE_TYPES.CONNECTED) {
    return handleSystemConnected(connection);
  }

  try {
    const parsed = JSON.parse(text);
    handleJsonMessage(parsed);
  } catch {
    handlePlainMessage(name, text, connection);
  }
}

// Called when a peer successfully connects.
//  Enables file transfer interface and sets up handlers.
function handleSystemConnected(connection) {
  if (isConnected) return;
  isConnected = true;
  clearTimeout(joinTimeout);
  showChatScreen();
  UI.chatStatus.innerText =
    userRole === 'server'
      ? '✅ Peer connected! Ready to transfer files.'
      : '✅ Connected to the server! Ready to transfer files.';
  UI.fileTransferUI.style.display = 'block';
  UI.sendFileButton.style.display = 'inline-block';
  setupFileTransfer(connection);
}

function handleJsonMessage(parsed) {
  if (parsed.type === 'file-meta' || parsed.type === 'file-chunk') {
    handleIncomingChunk(parsed);
  }
}

// Handles JSON-based messages from the peer.
// Supports file metadata and file chunks.
function handlePlainMessage(name, text, connection) {
  if (text.trim().toLowerCase() === 'hello') {
    connection.write(Buffer.from('👋 Hello from receiver!'));
  }
}

// Handles the creation of a new room.
async function handleCreateRoom() {
  try {
    showLoading();
    userRole = 'server';
    await createRoom(handleIncomingMessage);
    roomCode = getTopicHex();
    showChatScreen();
    await joinRoom(roomCode, handleIncomingMessage);
  } catch (error) {
    hideLoading();
    // eslint-disable-next-line no-console
    console.error('Error creating room:', error);
  }
}

// Joins an existing room using the topic entered by the user.
async function handleJoinRoom() {
  const topic = UI.topicInput.value.trim();
  if (!topic) {
    return alert('❌ Please enter a topic.');
  }
  isConnected = false;

  try {
    showLoading();
    userRole = 'client';
    roomCode = topic;
    await joinRoom(topic, handleIncomingMessage);
    joinTimeout = setTimeout(() => {
      if (!isConnected) {
        alert('❌ Connection timeout. Please check the room code or try again.');
        hideLoading();
        UI.mainUI.style.display = 'block';
      }
    }, 10000);
  } catch (error) {
    hideLoading();
    // eslint-disable-next-line no-console
    console.error('Error joining room:', error);
  }
}

function setupEventListeners() {
  UI.createButton.addEventListener('click', handleCreateRoom);
  UI.joinButton.addEventListener('click', handleJoinRoom);
  setupLeaveButton();
  setupCopyButton();
}

function startApp() {
  setupEventListeners();
}

startApp();
