import { useEffect, useRef, useState } from "react";
import * as signalR from "@microsoft/signalr";

const API_BASE = "http://localhost:58097";

function decodeUserId(token) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return (
      payload.nameid ||
      payload.sub ||
      payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"] ||
      null
    );
  } catch {
    return null;
  }
}

function AuthForm({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      if (mode === "register") {
        const res = await fetch(`${API_BASE}/api/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username,
            passwordHash: password,
            email: `${username}@local`
          })
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || "Registration failed");
        }

        setMode("login");
        return;
      }

      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          passwordHash: password
        })
      });

      if (!res.ok) {
        throw new Error("Invalid credentials");
      }

      const data = await res.json();
      localStorage.setItem("jwt", data.token);
      onLogin(data.token);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div style={styles.authWrapper}>
      <form style={styles.authCard} onSubmit={submit}>
        <h2 style={styles.authTitle}>
          {mode === "login" ? "Login" : "Create Account"}
        </h2>

        <input
          style={styles.input}
          placeholder="Username"
          value={username}
          onChange={e => setUsername(e.target.value)}
        />

        <input
          style={styles.input}
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />

        {error && <div style={styles.error}>{error}</div>}

        <button style={styles.primaryButton}>
          {mode === "login" ? "Login" : "Register"}
        </button>

        <div style={styles.toggle}>
          {mode === "login" ? (
            <>
              No account?{" "}
              <span style={styles.link} onClick={() => setMode("register")}>
                Register
              </span>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <span style={styles.link} onClick={() => setMode("login")}>
                Login
              </span>
            </>
          )}
        </div>
      </form>
    </div>
  );
}

function Chat({ token, onLogout, currentUserId }) {
  const [channels, setChannels] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");

  const connectionRef = useRef(null);
  const selectedChannelRef = useRef(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    selectedChannelRef.current = selectedChannel;
  }, [selectedChannel]);

  useEffect(() => {
    fetch(`${API_BASE}/api/channels`)
      .then(r => r.json())
      .then(data => {
        setChannels(data);
        if (data.length > 0) setSelectedChannel(data[0].id);
      });
  }, []);

  useEffect(() => {
    if (!token) return;

    const connection = new signalR.HubConnectionBuilder()
      .withUrl("http://localhost:58097/chatHub", {
        accessTokenFactory: () => token || localStorage.getItem("jwt")
      })
      .withAutomaticReconnect()
      .build();

    connection.on("ReceiveMessage", (message) => {
      if (message.roomId !== selectedChannelRef.current) return;
      setMessages(prev => [...prev, message]);
      setTimeout(scrollToBottom, 50);
    });

    connection.start().then(() => {
      if (selectedChannelRef.current) {
        connection.invoke("JoinRoom", selectedChannelRef.current);
      }
    });

    connectionRef.current = connection;

    return () => {
      if (connection) connection.stop();
    };
  }, [token]);

  useEffect(() => {
    if (!selectedChannel) return;

    fetch(`${API_BASE}/api/messages/${selectedChannel}`)
      .then(r => r.json())
      .then(data => {
        setMessages(data);
        setTimeout(scrollToBottom, 50);
      });

    const connection = connectionRef.current;

    if (connection && connection.state === "Connected") {
      connection.invoke("JoinRoom", selectedChannel);
    }
  }, [selectedChannel]);

  const sendMessage = async () => {
    const connection = connectionRef.current;
    if (!connection || !text.trim()) return;

    await connection.invoke("SendMessage", selectedChannel, text);
    setText("");
  };

  const logout = () => {
    const connection = connectionRef.current;
    if (connection) connection.stop();

    localStorage.removeItem("jwt");
    onLogout();
  };

  return (
    <div style={styles.app}>
      <div style={styles.sidebar}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
          <h3>Channels</h3>
          <button style={styles.logoutBtn} onClick={logout}>Logout</button>
        </div>

        {channels.map(c => (
          <div
            key={c.id}
            style={{
              ...styles.channelItem,
              background: selectedChannel === c.id ? "#e6f0ff" : "transparent"
            }}
            onClick={() => setSelectedChannel(c.id)}
          >
            {c.title}
          </div>
        ))}
      </div>

      <div style={styles.chatArea}>
        <div style={styles.messages}>
          {messages.map(m => {
            const isMine = m.senderId === currentUserId;
            const className = isMine ? "message-mine" : "message-other";

            return (
              <div
                key={m.id}
                className={className}
                style={{
                  ...styles.messageBase,
                  ...(isMine ? styles.messageMine : styles.messageOther)
                }}
              >
                {!isMine && (
                  <div style={styles.sender}>{m.senderName}</div>
                )}
                {m.content}
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        <div style={styles.inputBar}>
          <input
            style={styles.chatInput}
            value={text}
            placeholder="Type a message..."
            onChange={e => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") sendMessage();
            }}
          />
          <button style={styles.primaryButton} onClick={sendMessage}>
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("jwt"));
  const [currentUserId, setCurrentUserId] = useState(
    token ? decodeUserId(token) : null
  );

  const handleLogin = (newToken) => {
    setToken(newToken);
    setCurrentUserId(decodeUserId(newToken));
  };

  const handleLogout = () => {
    setToken(null);
    setCurrentUserId(null);
  };

  if (!token) {
    return <AuthForm onLogin={handleLogin} />;
  }

  return (
    <Chat
      token={token}
      currentUserId={currentUserId}
      onLogout={handleLogout}
    />
  );
}

const styles = {
  authWrapper: {
    height: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "#f5f7fb",
    fontFamily: "Arial, sans-serif"
  },

  authCard: {
    background: "white",
    padding: 30,
    borderRadius: 10,
    width: 320,
    boxShadow: "0 6px 20px rgba(0,0,0,0.08)",
    display: "flex",
    flexDirection: "column",
    gap: 12
  },

  authTitle: {
    marginBottom: 10,
    textAlign: "center"
  },

  input: {
    padding: 10,
    borderRadius: 6,
    border: "1px solid #ccc",
    fontSize: 14
  },

  primaryButton: {
    padding: 10,
    borderRadius: 6,
    border: "none",
    background: "#007bff",
    color: "white",
    cursor: "pointer",
    fontWeight: "bold"
  },

  toggle: {
    marginTop: 10,
    textAlign: "center",
    fontSize: 13
  },

  link: {
    color: "#007bff",
    cursor: "pointer"
  },

  error: {
    color: "red",
    fontSize: 12
  },

  app: {
    display: "flex",
    height: "100vh",
    fontFamily: "Arial, sans-serif"
  },

  sidebar: {
    width: 220,
    borderRight: "1px solid #ddd",
    padding: 15
  },

  logoutBtn: {
    border: "none",
    background: "#ef4444",
    color: "white",
    padding: "4px 8px",
    borderRadius: 4,
    cursor: "pointer"
  },

  channelItem: {
    padding: 8,
    borderRadius: 6,
    cursor: "pointer"
  },

  chatArea: {
    flex: 1,
    display: "flex",
    flexDirection: "column"
  },

  messages: {
    flex: 1,
    overflowY: "auto",
    padding: 15,
    display: "flex",
    flexDirection: "column"
  },

  messageBase: {
    padding: "10px",
    borderRadius: "15px",
    margin: "5px",
    maxWidth: "60%"
  },

  messageMine: {
    marginLeft: "auto",
    backgroundColor: "#007bff",
    color: "white",
    borderBottomRightRadius: 0
  },

  messageOther: {
    marginRight: "auto",
    backgroundColor: "#e9ecef",
    color: "black",
    borderBottomLeftRadius: 0
  },

  sender: {
    fontSize: 12,
    opacity: 0.7,
    marginBottom: 3
  },

  inputBar: {
    position: "sticky",
    bottom: 0,
    display: "flex",
    padding: 10,
    borderTop: "1px solid #ddd",
    gap: 10,
    background: "white"
  },

  chatInput: {
    flex: 1,
    padding: 10,
    borderRadius: 6,
    border: "1px solid #ccc"
  }
};
