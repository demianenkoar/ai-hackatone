import React, { useEffect, useState } from "react";
import * as signalR from "@microsoft/signalr";

export default function App() {
  const [channels, setChannels] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [connection, setConnection] = useState(null);

  const [messages, setMessages] = useState([]);
  const [oldestTimestamp, setOldestTimestamp] = useState(null);

  const [message, setMessage] = useState("");

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
      .withUrl("http://localhost:58097/chatHub")
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
      .then(() => console.log("Connected to chat hub"))
      .catch((err) => console.error("SignalR connection error:", err));

    setConnection(conn);

    return () => {
      conn.stop();
    };
  }, []);

  useEffect(() => {
    if (!selectedChannel) return;

    setMessages([]);
    setOldestTimestamp(null);

    fetch(`http://localhost:58097/api/messages/${selectedChannel}`)
      .then((res) => res.json())
      .then((data) => {
        setMessages(data);
        if (data.length > 0) {
          setOldestTimestamp(data[0].timestamp);
        }
      })
      .catch((err) => console.error("Failed to load messages", err));
  }, [selectedChannel]);

  const loadMore = async () => {
    if (!oldestTimestamp || !selectedChannel) return;

    try {
      const res = await fetch(
        `http://localhost:58097/api/messages/${selectedChannel}?before=${encodeURIComponent(oldestTimestamp)}`
      );

      const data = await res.json();

      if (data.length > 0) {
        setMessages((prev) => [...data, ...prev]);
        setOldestTimestamp(data[0].timestamp);
      }
    } catch (err) {
      console.error("Load more failed", err);
    }
  };

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
    <div style={styles.container}>
      <div style={styles.sidebar}>
        <h3>Channels</h3>
        {channels.map((c) => (
          <div
            key={c.id}
            style={{
              ...styles.channel,
              background:
                selectedChannel === c.id ? "#e2e8f0" : "transparent"
            }}
            onClick={() => setSelectedChannel(c.id)}
          >
            {c.title}
          </div>
        ))}
      </div>

      <div style={styles.chatArea}>
        <div style={styles.messages}>
          <button onClick={loadMore} style={styles.loadMore}>
            Load More
          </button>

          {messages.map((m) => (
            <div
              key={m.id}
              style={{
                ...styles.messageRow,
                justifyContent: "flex-start"
              }}
            >
              <div style={styles.messageBubble}>
                <div style={styles.sender}>{m.senderId}</div>
                <div>{m.content}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={styles.inputArea}>
          <input
            style={styles.input}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message..."
          />
          <button style={styles.sendBtn} onClick={sendMessage}>
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    height: "100vh",
    fontFamily: "Arial, sans-serif"
  },
  sidebar: {
    width: "220px",
    borderRight: "1px solid #ddd",
    padding: "10px"
  },
  channel: {
    padding: "8px",
    cursor: "pointer",
    borderRadius: "4px",
    marginBottom: "4px"
  },
  chatArea: {
    flex: 1,
    display: "flex",
    flexDirection: "column"
  },
  messages: {
    flex: 1,
    overflowY: "auto",
    padding: "16px",
    background: "#f7fafc"
  },
  messageRow: {
    display: "flex",
    marginBottom: "10px"
  },
  messageBubble: {
    background: "white",
    padding: "10px 12px",
    borderRadius: "8px",
    boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
    maxWidth: "60%"
  },
  sender: {
    fontSize: "12px",
    color: "#666",
    marginBottom: "4px"
  },
  inputArea: {
    borderTop: "1px solid #ddd",
    padding: "10px",
    display: "flex",
    gap: "8px"
  },
  input: {
    flex: 1,
    padding: "8px"
  },
  sendBtn: {
    padding: "8px 14px",
    cursor: "pointer"
  },
  loadMore: {
    marginBottom: "10px",
    padding: "6px 10px",
    cursor: "pointer"
  }
};
