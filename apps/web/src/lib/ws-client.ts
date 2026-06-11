import type { ServerMessage } from "@olympus/shared";

/**
 * Connects to the Engine WebSocket and invokes onMessage for every parsed
 * ServerMessage (snapshot-on-connect, then event stream). Returns a cleanup
 * function that closes the socket.
 */
export function connectToEngine(url: string, onMessage: (message: ServerMessage) => void): () => void {
  const socket = new WebSocket(url);

  socket.addEventListener("message", (ev) => {
    try {
      const message = JSON.parse(ev.data as string) as ServerMessage;
      onMessage(message);
    } catch (err) {
      console.error("[ws-client] failed to parse message", err);
    }
  });

  socket.addEventListener("error", (err) => {
    console.error("[ws-client] socket error", err);
  });

  return () => socket.close();
}
