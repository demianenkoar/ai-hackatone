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
        className="h-[400px] overflow-y-scroll border border-[#e1dfdd] p-4 mb-3 bg-[#f3f2f1]"
      >
        {messages.map(m => (
          <div key={m.id} className="flex gap-3 mb-3">
            <div className="avatar">
              {m.senderId ? String(m.senderId)[0].toUpperCase() : "U"}
            </div>

            <div className="bg-white border border-[#e1dfdd] rounded px-3 py-2">
              <div className="text-xs text-gray-500 mb-1">
                <strong>{m.senderId}</strong>
              </div>
              {m.content}
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={sendMessage} className="flex gap-2">
        <input
          name="message"
          placeholder="Type message..."
          className="flex-1 border rounded px-3 py-2"
        />
        <button
          type="submit"
          className="text-white px-4 rounded"
          style={{ backgroundColor: "#6264a7" }}
        >
          Send
        </button>
      </form>
    </div>
  );
}
