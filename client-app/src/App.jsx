import { useEffect, useRef, useState } from "react";
import * as signalR from "@microsoft/signalr";

const API_BASE = "http://localhost:58097";

export default function App() {
  const [channels, setChannels] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [messages, setMessages] = useState([]);
  const [oldestTimestamp, setOldestTimestamp] = useState(null);
  const [messageText, setMessageText] = useState("");

  const connectionRef = useRef(null);
  const selectedChannelRef = useRef(null);
  const messageContainerRef = useRef(null);
  const loadingRef = useRef(false);

  useEffect(() => {
    selectedChannelRef.current = selectedChannel;
  }, [selectedChannel]);

  useEffect(() => {
    fetch(`${API_BASE}/api/channels`)
      .then(r => r.json())
      .then(data => {
        setChannels(data);
        if (data.length > 0) {
          setSelectedChannel(data[0].id);
        }
      })
      .catch(err => console.error("Failed to load channels", err));
  }, []);

  useEffect(() => {
    if (connectionRef.current) {
      const state = connectionRef.current.state;
      if (
        state === signalR.HubConnectionState.Connected ||
        state === signalR.HubConnectionState.Connecting
      ) {
        return;
      }
    }

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${API_BASE}/chatHub`)
      .withAutomaticReconnect()
      .build();

    connection.on("ReceiveMessage", (message) => {
      console.log("SignalR: Received message", message);

      if (!message) return;
      if (message.roomId !== selectedChannelRef.current) return;

      setMessages(prev => [...prev, message]);

      setTimeout(() => {
        const el = messageContainerRef.current;
        if (el) el.scrollTop = el.scrollHeight;
      }, 50);
    });

    connectionRef.current = connection;

    connection
      .start()
      .then(() => {
        console.log("SignalR connected");
        if (selectedChannelRef.current) {
          connection.invoke("JoinRoom", selectedChannelRef.current);
        }
      })
      .catch(err => console.error("SignalR start error:", err));

    return () => {
      if (connection.state === signalR.HubConnectionState.Connected) {
        connection.stop();
      }
    };
  }, []);

  useEffect(() => {
    if (!selectedChannel) return;

    setMessages([]);
    setOldestTimestamp(null);

    const connection = connectionRef.current;

    const joinRoom = async () => {
      if (!connection) return;

      if (connection.state === signalR.HubConnectionState.Connected) {
        try {
          await connection.invoke("JoinRoom", selectedChannel);
          console.log("Joined room", selectedChannel);
        } catch (err) {
          console.error("JoinRoom failed:", err);
        }
      }
    };

    joinRoom();

    fetch(`${API_BASE}/api/messages/${selectedChannel}`)
      .then(r => r.json())
      .then(data => {
        setMessages(data);

        if (data.length > 0) {
          setOldestTimestamp(data[0].timestamp);
        }

        setTimeout(() => {
          const el = messageContainerRef.current;
          if (el) el.scrollTop = el.scrollHeight;
        }, 50);
      })
      .catch(err => console.error("Failed to load messages", err));
  }, [selectedChannel]);

  const loadOlderMessages = async () => {
    if (!oldestTimestamp || loadingRef.current || !selectedChannel) return;

    loadingRef.current = true;

    try {
      const res = await fetch(
        `${API_BASE}/api/messages/${selectedChannel}?before=${encodeURIComponent(oldestTimestamp)}`
      );

      const data = await res.json();

      if (data.length > 0) {
        setMessages(prev => [...data, ...prev]);
        setOldestTimestamp(data[0].timestamp);
      }
    } catch (err) {
      console.error("Failed loading older messages", err);
    }

    loadingRef.current = false;
  };

  const handleScroll = () => {
    const el = messageContainerRef.current;
    if (!el) return;

    if (el.scrollTop === 0) {
      loadOlderMessages();
    }
  };

  const sendMessage = async () => {
    const connection = connectionRef.current;

    if (!connection) return;
    if (connection.state !== signalR.HubConnectionState.Connected) return;
    if (!selectedChannel || !messageText.trim()) return;

    try {
      await connection.invoke("SendMessage", selectedChannel, messageText);
      setMessageText("");
    } catch (err) {
      console.error("Send failed", err);
    }
  };

  return (
    <div style={styles.app}>
      <div style={styles.sidebar}>
        <div style={styles.sidebarHeader}>Channels</div>

        {channels.map(c => (
          <div
            key={c.id}
            style={{
              ...styles.channelItem,
              background: selectedChannel === c.id ? "#e6edf7" : "transparent"
            }}
            onClick={() => setSelectedChannel(c.id)}
          >
            {c.title}
          </div>
        ))}
      </div>

      <div style={styles.chat}>
        <div
          ref={messageContainerRef}
          onScroll={handleScroll}
          style={styles.messages}
        >
          {messages.map(m => (
            <div key={m.id} style={styles.message}>
              <div style={styles.sender}>{m.senderId}</div>
              <div>{m.content}</div>
              <div style={styles.time}>
                {new Date(m.timestamp).toLocaleTimeString()}
              </div>
            </div>
          ))}
        </div>

        <div style={styles.inputBar}>
          <input
            style={styles.input}
            value={messageText}
            placeholder="Type a message..."
            onChange={e => setMessageText(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter") sendMessage();
            }}
          />
          <button style={styles.button} onClick={sendMessage}>
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  app: {
    display: "flex",
    height: "100vh",
    fontFamily: "Arial, sans-serif",
    background: "#f5f7fb"
  },
  sidebar: {
    width: "220px",
    borderRight: "1px solid #ddd",
    background: "#ffffff",
    display: "flex",
    flexDirection: "column"
  },
  sidebarHeader: {
    padding: "14px",
    fontWeight: "bold",
    borderBottom: "1px solid #eee"
  },
  channelItem: {
    padding: "10px 14px",
    cursor: "pointer"
  },
  chat: {
    flex: 1,
    display: "flex",
    flexDirection: "column"
  },
  messages: {
    flex: 1,
    overflowY: "auto",
    padding: "16px"
  },
  message: {
    background: "#ffffff",
    borderRadius: "8px",
    padding: "10px 12px",
    marginBottom: "10px",
    maxWidth: "520px",
    boxShadow: "0 1px 2px rgba(0,0,0,0.08)"
  },
  sender: {
    fontSize: "12px",
    color: "#555",
    marginBottom: "4px",
    fontWeight: "bold"
  },
  time: {
    fontSize: "11px",
    color: "#888",
    marginTop: "4px"
  },
  inputBar: {
    borderTop: "1px solid #ddd",
    padding: "10px",
    display: "flex",
    gap: "8px",
    background: "#fff"
  },
  input: {
    flex: 1,
    padding: "8px",
    border: "1px solid #ccc",
    borderRadius: "6px"
  },
  button: {
    padding: "8px 14px",
    border: "none",
    borderRadius: "6px",
    background: "#3b82f6",
    color: "white",
    cursor: "pointer"
  }
};
