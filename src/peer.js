// peer.js
import Hyperswarm from "hyperswarm";
import crypto from "hypercore-crypto";
import b4a from "b4a";

const { teardown } = Pear;

const swarm = new Hyperswarm();
let topicBuffer = null;
let onMessage = null;

// Tear down swarm on app exit
teardown(() => swarm.destroy());

// Handle incoming connections
swarm.on("connection", (peer) => {
  const name = b4a.toString(peer.remotePublicKey, "hex").substr(0, 6);
  peer.on("data", (message) => onMessage(name, message));
  peer.on("error", (e) => alert(`❌ Connection error: ${e.message}`));
});

// Create a new room (new random topic)
export async function createRoom(handleIncomingMessage) {
  topicBuffer = crypto.randomBytes(32);
  onMessage = handleIncomingMessage;
  const discovery = swarm.join(topicBuffer, { client: true, server: true });
  await discovery.flushed();
}

// Join an existing room by topic
export async function joinRoom(topicHex, handleIncomingMessage) {
  topicBuffer = b4a.from(topicHex.trim(), "hex");
  onMessage = handleIncomingMessage;
  const discovery = swarm.join(topicBuffer, { client: true, server: true });
  await discovery.flushed();
}

// Get current topic as hex string
export function getTopicHex() {
  if (!topicBuffer) {
    return "";
  }
  return b4a.toString(topicBuffer, "hex");
}
