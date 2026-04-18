import React, { useEffect, useRef, useState } from "react";
import * as signalR from "@microsoft/signalr";

export default function MessageList({ roomId }) {
  const [messages, setMessages] = useState([]);
  const [connection, setConnection] = useState(null);
  const containerRef = useRef(null);
  const loadingRef = useRef(false);

  useEffect(() => {
    loadMessages();

    const conn = new signalR.HubConnectionBuilder()
      .withUrl("/chatHub?username=reactUser")
      .withAutomaticReconnect()
      .build();

    conn.on("ReceiveMessage", (id, room, sender, content, timestamp) => {
      setMessages(prev => [
        ...prev,
        { id, roomId: room, senderId: sender, content, timestamp }
      ]);

      setTimeout(() => {
        const el = containerRef.current;
        if (el) el.scrollTop = el.scrollHeight;
      }, 0);
    });

    conn.start().then(() => {
      conn.invoke("JoinRoom", roomId);
    });

    setConnection(conn);

    return () => {
      conn.stop();
    };
  }, [roomId]);

  async function loadMessages(before) {
    if (loadingRef.current) return;

    loadingRef.current = true;

    let url = `/api/messages/${roomId}?limit=20`;
    if (before) {
      url += `&before=${encodeURIComponent(before)}`;
    }

    const res = await fetch(url);
    const data = await res.json();

    const container = containerRef.current;
    const prevHeight = container ? container.scrollHeight : 0;

    setMessages(prev => [...data, ...prev]);

    setTimeout(() => {
      if (container) {
        const newHeight = container.scrollHeight;
        container.scrollTop = newHeight - prevHeight;
      }
    }, 0);

    loadingRef.current = false;
  }

  function handleScroll() {
    const el = containerRef.current;
    if (!el) return;

    if (el.scrollTop === 0 && messages.length > 0) {
      const oldest = messages[0].timestamp;
      loadMessages(oldest);
    }
  }

  async function sendMessage(e) {
    e.preventDefault();
    const input = e.target.elements.message;
    const text = input.value;

    if (!text || !connection) return;

    await connection.invoke("SendMessage", roomId, text);
    input.value = "";
  }

  return (
    <div>
      <div
        ref={containerRef}
        onScroll={handleScroll}
        style={{
          height: "400px",
          overflowY: "scroll",
          border: "1px solid #ccc",
          padding: "10px",
          marginBottom: "10px"
        }}
      >
        {messages.map(m => (
          <div key={m.id}>
            <strong>{m.senderId}</strong>: {m.content}
          </div>
        ))}
      </div>

      <form onSubmit={sendMessage}>
        <input
          name="message"
          placeholder="Type message..."
          style={{ width: "80%" }}
        />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}
