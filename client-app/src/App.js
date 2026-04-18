import React, { useEffect, useState } from "react";
import * as signalR from "@microsoft/signalr";

export default function App() {
  const [channels, setChannels] = useState([]);
  const [connection, setConnection] = useState(null);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    fetch("http://localhost:58097/api/channels")
      .then((res) => res.json())
      .then((data) => {
        setChannels(data);
        if (data.length > 0) {
          setSelectedChannel(data[0].id);
        }
      })
      .catch((err) => console.error("Failed to load channels", err));
  }, []);

  useEffect(() => {
    const conn = new signalR.HubConnectionBuilder()
      .withUrl("http://localhost:58097/chathub")
      .withAutomaticReconnect()
      .build();

    conn.on("ReceiveMessage", (id, roomId, senderId, content, timestamp) => {
      setMessages((prev) => [
        ...prev,
        { id, roomId, senderId, content, timestamp }
      ]);
    });

    conn
      .start()
      .then(() => {
        console.log("Connected to chat hub");
      })
      .catch((err) => console.error("SignalR connection error:", err));

    setConnection(conn);

    return () => {
      conn.stop();
    };
  }, []);

  const sendMessage = async () => {
    if (!connection || !selectedChannel || !message) return;

    try {
      await connection.invoke("SendMessage", selectedChannel, message);
      setMessage("");
    } catch (err) {
      console.error("Send failed:", err);
    }
  };

  return (
    <div style={{ width: "600px", margin: "40px auto", fontFamily: "Arial" }}>
      <h2>React Chat</h2>

      <h3>Channels</h3>
      <ul>
        {channels.map((c) => (
          <li
            key={c.id}
            style={{
              cursor: "pointer",
              fontWeight: selectedChannel === c.id ? "bold" : "normal"
            }}
            onClick={() => setSelectedChannel(c.id)}
          >
            {c.title}
          </li>
        ))}
      </ul>

      <h3>Messages</h3>
      <div
        style={{
          border: "1px solid #ccc",
          height: "200px",
          overflowY: "auto",
          padding: "10px",
          marginBottom: "10px"
        }}
      >
        {messages.map((m) => (
          <div key={m.id}>
            <b>{m.senderId}</b>: {m.content}
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: "8px" }}>
        <input
          style={{ flex: 1 }}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message..."
        />
        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
}
