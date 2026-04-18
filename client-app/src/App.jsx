import { useEffect, useRef, useState } from "react";
import * as signalR from "@microsoft/signalr";

const API_BASE = "http://localhost:58097";
const PAGE_SIZE = 20;

function decodeUser(token) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const id =
      payload.nameid ||
      payload.sub ||
      payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"] ||
      null;

    const username =
      payload.unique_name ||
      payload.name ||
      payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"] ||
      "User";

    return { id, username };
  } catch {
    return { id: null, username: "User" };
  }
}

function formatTime(ts) {
  const d = new Date(ts);
  return d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
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
    <div className="h-screen flex items-center justify-center bg-slate-100">
      <form
        onSubmit={submit}
        className="bg-white p-8 rounded-xl shadow-xl w-80 space-y-4"
      >
        <h2 className="text-xl font-semibold text-center">
          {mode === "login" ? "Login" : "Create Account"}
        </h2>

        <input
          className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
          placeholder="Username"
          value={username}
          onChange={e => setUsername(e.target.value)}
        />

        <input
          className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />

        {error && (
          <div className="text-red-500 text-sm">{error}</div>
        )}

        <button className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">
          {mode === "login" ? "Login" : "Register"}
        </button>

        <div className="text-sm text-center">
          {mode === "login" ? (
            <>
              No account?{" "}
              <span
                className="text-blue-600 cursor-pointer"
                onClick={() => setMode("register")}
              >
                Register
              </span>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <span
                className="text-blue-600 cursor-pointer"
                onClick={() => setMode("login")}
              >
                Login
              </span>
            </>
          )}
        </div>
      </form>
    </div>
  );
}

function Chat({ token, currentUserId, currentUsername, onLogout }) {
  const [channels, setChannels] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [typingUser, setTypingUser] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const connectionRef = useRef(null);
  const containerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/channels`)
      .then(r => r.json())
      .then(data => {
        setChannels(data);
        if (data.length > 0) setSelectedChannel(data[0].id);
      });
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadMoreMessages = async () => {
    if (!hasMore || loadingMore || messages.length === 0) return;

    setLoadingMore(true);

    const oldest = messages[0];
    const container = containerRef.current;
    const previousHeight = container.scrollHeight;

    const res = await fetch(
      `${API_BASE}/api/messages/${selectedChannel}?before=${encodeURIComponent(
        oldest.timestamp
      )}&pageSize=${PAGE_SIZE}`
    );

    const olderMessages = await res.json();

    if (olderMessages.length < PAGE_SIZE) {
      setHasMore(false);
    }

    setMessages(prev => [...olderMessages, ...prev]);

    setTimeout(() => {
      const newHeight = container.scrollHeight;
      container.scrollTop = newHeight - previousHeight;
    }, 0);

    setLoadingMore(false);
  };

  const handleScroll = () => {
    const container = containerRef.current;
    if (!container) return;

    if (container.scrollTop === 0) {
      loadMoreMessages();
    }
  };

  useEffect(() => {
    if (!selectedChannel) return;

    setHasMore(true);

    fetch(`${API_BASE}/api/messages/${selectedChannel}?pageSize=${PAGE_SIZE}`)
      .then(r => r.json())
      .then(data => {
        setMessages(data);
      });

  }, [selectedChannel]);

  useEffect(() => {
    if (!token) return;

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${API_BASE}/chatHub`, {
        accessTokenFactory: () => token
      })
      .withAutomaticReconnect()
      .build();

    connection.on("ReceiveMessage", (msg) => {
      if (msg.roomId !== selectedChannel) return;
      setMessages(prev => [...prev, msg]);
    });

    connection.on("UserTyping", (username, isTyping) => {
      if (isTyping) {
        setTypingUser(username);
      } else {
        setTypingUser(null);
      }
    });

    connection.start().then(() => {
      if (selectedChannel) {
        connection.invoke("JoinRoom", selectedChannel);
      }
    });

    connectionRef.current = connection;

    return () => {
      connection.stop();
    };
  }, [token, selectedChannel]);

  const handleTyping = (value) => {
    setText(value);

    const connection = connectionRef.current;
    if (!connection || !selectedChannel) return;

    connection.invoke("SendTypingNotification", selectedChannel.toString(), true);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      connection.invoke("SendTypingNotification", selectedChannel.toString(), false);
    }, 3000);
  };

  const sendMessage = async () => {
    const connection = connectionRef.current;
    if (!connection || !text.trim()) return;

    await connection.invoke("SendMessage", selectedChannel, text);
    setText("");

    connection.invoke("SendTypingNotification", selectedChannel.toString(), false);
  };

  return (
    <div className="w-full h-screen flex overflow-hidden">
      <div className="w-64 bg-slate-100 border-r border-slate-200 p-4 flex flex-col">
        <div className="mb-4">
          <div className="font-semibold">Channels</div>
          <div className="text-xs text-slate-500">
            Logged in as: {currentUsername}
          </div>
        </div>

        <div className="space-y-2 flex-1">
          {channels.map(c => (
            <div
              key={c.id}
              onClick={() => setSelectedChannel(c.id)}
              className={`p-2 rounded cursor-pointer ${
                selectedChannel === c.id
                  ? "bg-blue-100"
                  : "hover:bg-slate-200"
              }`}
            >
              {c.title}
            </div>
          ))}
        </div>

        <button
          onClick={onLogout}
          className="text-sm text-red-500 mt-4"
        >
          Logout
        </button>
      </div>

      <div className="flex-1 flex flex-col bg-white">
        <div
          id="message-container"
          ref={containerRef}
          onScroll={handleScroll}
          className="flex-1 flex flex-col p-4 overflow-y-auto space-y-4"
        >
          {messages.map(msg => {
            const mine = msg.senderId === currentUserId;

            return (
              <div key={msg.id} className="w-full flex">
                <div className={mine ? "w-full flex justify-end" : "w-full flex justify-start"}>
                  <div className="max-w-xs flex flex-col">
                    {!mine && (
                      <div className="text-[11px] text-slate-500 mb-1">
                        {msg.senderName}
                      </div>
                    )}

                    <div
                      className={
                        mine
                          ? "bg-blue-600 text-white rounded-2xl rounded-tr-none px-4 py-2 shadow-sm"
                          : "bg-slate-200 text-black rounded-2xl rounded-tl-none px-4 py-2 shadow-sm"
                      }
                    >
                      {msg.content}
                      <div className="text-[10px] opacity-70 mt-1">
                        {formatTime(msg.timestamp)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          <div ref={messagesEndRef} />
        </div>

        <div className="text-xs text-slate-500 italic ml-2 h-4">
          {typingUser ? `${typingUser} is typing...` : ""}
        </div>

        <div className="border-t border-slate-200 p-3 flex gap-2">
          <input
            value={text}
            onChange={(e) => handleTyping(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") sendMessage();
            }}
            placeholder="Type a message..."
            className="flex-1 border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
          />

          <button
            onClick={sendMessage}
            className="bg-blue-600 text-white px-4 rounded-lg hover:bg-blue-700"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("jwt"));
  const [user, setUser] = useState(
    token ? decodeUser(token) : { id: null, username: "" }
  );

  const handleLogin = (t) => {
    setToken(t);
    setUser(decodeUser(t));
  };

  const handleLogout = () => {
    localStorage.removeItem("jwt");
    setToken(null);
    setUser({ id: null, username: "" });
  };

  if (!token) {
    return <AuthForm onLogin={handleLogin} />;
  }

  return (
    <Chat
      token={token}
      currentUserId={user.id}
      currentUsername={user.username}
      onLogout={handleLogout}
    />
  );
}
