import { useEffect, useRef, useState } from "react";
import * as signalR from "@microsoft/signalr";

const API_BASE = "http://localhost:58097";
const PAGE_SIZE = 20;
const BOTTOM_THRESHOLD = 80;

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

function formatTimestamp(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  const now = new Date();

  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();

  if (sameDay) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  return (
    d.toLocaleDateString() +
    " " +
    d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  );
}

function AuthPage({ setToken }) {
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const login = async () => {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        username,
        password
      })
    });

    if (!res.ok) {
      alert("Login failed");
      return;
    }

    const data = await res.json();
    const token = data.token || data;

    localStorage.setItem("token", token);
    setToken(token);
  };

  const register = async () => {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        username,
        password
      })
    });

    if (!res.ok) {
      alert("Registration failed");
      return;
    }

    await login();
  };

  return (
    <div className="w-full h-screen flex items-center justify-center bg-slate-100">
      <div className="bg-white p-8 rounded shadow w-80 border border-[#e1dfdd]">
        <h2 className="text-xl font-semibold mb-4">
          {mode === "login" ? "Login" : "Register"}
        </h2>

        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Username"
          className="w-full border px-3 py-2 rounded mb-3"
        />

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full border px-3 py-2 rounded mb-4"
        />

        {mode === "login" ? (
          <button
            onClick={login}
            className="w-full text-white py-2 rounded"
            style={{ backgroundColor: "#6264a7" }}
          >
            Login
          </button>
        ) : (
          <button
            onClick={register}
            className="w-full text-white py-2 rounded"
            style={{ backgroundColor: "#6264a7" }}
          >
            Register
          </button>
        )}

        <div className="text-sm mt-4 text-center">
          {mode === "login" ? (
            <span>
              No account?{" "}
              <button
                className="text-[#6264a7]"
                onClick={() => setMode("register")}
              >
                Register
              </button>
            </span>
          ) : (
            <span>
              Already have an account?{" "}
              <button
                className="text-[#6264a7]"
                onClick={() => setMode("login")}
              >
                Login
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function Chat({ token, user, onLogout }) {
  const [channels, setChannels] = useState([]);
  const [currentRoomId, setCurrentRoomId] = useState(null);

  const [messages, setMessages] = useState([]);
  const [members, setMembers] = useState([]);

  const [text, setText] = useState("");
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [isPublic, setIsPublic] = useState(true);

  const connectionRef = useRef(null);
  const containerRef = useRef(null);
  const messagesEndRef = useRef(null);

  const handleCreateChannelClick = (e) => {
    e.stopPropagation();
    console.log("Button clicked");
    setShowCreateModal(true);
  };

  const handleInviteMemberClick = (e) => {
    e.stopPropagation();
    console.log("Button clicked");
    setShowInviteModal(true);
  };

  const currentRoom = channels.find(c => c.id === currentRoomId);
  const isPrivateRoom = currentRoom?.isPrivate ?? !currentRoom?.isPublic;

  const safeFetch = async (url, options = {}) => {
    const res = await fetch(url, options);
    if (res.status === 401) {
      console.warn("Unauthorized request:", url);
      return null;
    }
    return res;
  };

  const scrollToBottom = () => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  };

  const isNearBottom = () => {
    const el = containerRef.current;
    if (!el) return false;
    return el.scrollHeight - el.scrollTop - el.clientHeight < BOTTOM_THRESHOLD;
  };

  const loadChannels = async () => {
    const res = await safeFetch(`${API_BASE}/api/channels`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res) return;

    const data = await res.json();
    setChannels(data);

    if (!currentRoomId && data.length > 0) {
      setCurrentRoomId(data[0].id);
    }

    if (currentRoomId && !data.find(c => c.id === currentRoomId) && data.length > 0) {
      setCurrentRoomId(data[0].id);
    }
  };

  const createRoom = async () => {
    if (!newRoomName.trim()) return;

    const res = await safeFetch(`${API_BASE}/api/rooms`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        name: newRoomName,
        isPublic: isPublic
      })
    });

    if (!res) return;

    setShowCreateModal(false);
    setNewRoomName("");
    setIsPublic(true);

    loadChannels();
  };

  const loadMembers = async (roomId) => {
    const res = await safeFetch(`${API_BASE}/api/rooms/${roomId}/members`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res) return;

    const data = await res.json();
    setMembers(data);
  };

  const fetchMessages = async (roomId, before) => {
    if (!roomId) return;

    let url = `${API_BASE}/api/messages/${roomId}?limit=${PAGE_SIZE}`;
    if (before) {
      url += `&before=${encodeURIComponent(before)}`;
    }

    const res = await safeFetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res) return [];

    const data = await res.json();
    return data;
  };

  const loadInitialMessages = async (roomId) => {
    const data = await fetchMessages(roomId);

    setMessages(data);
    setHasMore(data.length === PAGE_SIZE);

    setTimeout(scrollToBottom, 50);
  };

  const loadOlderMessages = async () => {
    if (!hasMore || loadingMore || messages.length === 0) return;

    const container = containerRef.current;
    if (!container) return;

    setLoadingMore(true);

    const oldest = messages[0];
    const prevHeight = container.scrollHeight;

    const older = await fetchMessages(currentRoomId, oldest.timestamp);

    if (older.length < PAGE_SIZE) {
      setHasMore(false);
    }

    setMessages(prev => [...older, ...prev]);

    setTimeout(() => {
      const newHeight = container.scrollHeight;
      container.scrollTop = newHeight - prevHeight;
    }, 0);

    setLoadingMore(false);
  };

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;

    if (el.scrollTop === 0) {
      loadOlderMessages();
    }
  };

  const searchUsers = async (query) => {
    setSearchQuery(query);

    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    const res = await safeFetch(
      `${API_BASE}/api/users/search?query=${encodeURIComponent(query)}`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    if (!res) return;

    const data = await res.json();
    setSearchResults(data);
  };

  const inviteUser = async (userId) => {
    const res = await safeFetch(
      `${API_BASE}/api/rooms/${currentRoomId}/add-user/${userId}`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    if (!res) return;

    alert("User added");
    setShowInviteModal(false);
    setSearchResults([]);
    setSearchQuery("");
    loadMembers(currentRoomId);
  };

  useEffect(() => {
    loadChannels();
  }, []);

  useEffect(() => {
    if (!currentRoomId) return;

    setMembers([]);
    if (isPrivateRoom) {
      loadMembers(currentRoomId);
    }

    setMessages([]);
    setHasMore(true);
    loadInitialMessages(currentRoomId);
  }, [currentRoomId]);

  useEffect(() => {
    if (!token) return;

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${API_BASE}/chatHub`, {
        accessTokenFactory: () => token
      })
      .withAutomaticReconnect()
      .build();

    connection.on("ReceiveMessage", (msg) => {
      if (msg.roomId !== currentRoomId) return;

      const shouldScroll = isNearBottom();

      setMessages(prev => [...prev, msg]);

      if (shouldScroll) {
        setTimeout(scrollToBottom, 20);
      }
    });

    connection.start().then(() => {
      if (currentRoomId) {
        connection.invoke("JoinRoom", currentRoomId);
      }
    });

    connectionRef.current = connection;

    return () => connection.stop();
  }, [token, currentRoomId]);

  const sendMessage = async () => {
    if (!text.trim()) return;

    await connectionRef.current.invoke("SendMessage", currentRoomId, text);
    setText("");

    setTimeout(scrollToBottom, 50);
  };

  const publicChannels = channels.filter(c => !(c.isPrivate ?? !c.isPublic));
  const privateChannels = channels.filter(c => (c.isPrivate ?? !c.isPublic));

  const renderChannel = (c) => {
    const active = c.id === currentRoomId;

    return (
      <div
        key={c.id}
        onClick={() => setCurrentRoomId(c.id)}
        className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-all
        ${active ? "bg-white channel-active" : "hover:bg-gray-200"}`}
      >
        <span>{c.name ?? c.title}</span>
      </div>
    );
  };

  return (
    <div className="w-full h-screen flex overflow-hidden bg-white">

      <div className="w-16 bg-[#2b2b2b]"></div>

      <div className="w-64 bg-[#f3f2f1] border-r p-4 flex flex-col">
        <div className="flex justify-between items-center mb-2">
          <div className="font-semibold">Channels</div>
          <button
            onClick={handleCreateChannelClick}
            className="text-xs text-white px-2 py-1 rounded relative z-10"
            style={{ backgroundColor: "#6264a7" }}
          >
            +
          </button>
        </div>

        <div className="text-xs text-slate-500 mb-3">
          Logged in as: {user.username}
        </div>

        <div className="text-xs font-semibold text-slate-500 mt-2">Public Channels</div>
        {publicChannels.map(renderChannel)}

        <div className="text-xs font-semibold text-slate-500 mt-4">Private Groups</div>
        {privateChannels.map(renderChannel)}

        <button onClick={onLogout} className="text-sm text-red-500 mt-auto">
          Logout
        </button>
      </div>

      <div className="flex-1 flex flex-col">

        <div className="teams-header p-3 font-semibold">
          Chat
        </div>

        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#f3f2f1]"
        >
          {messages.map(msg => {
            const mine = msg.senderId === user.id;
            const time = formatTimestamp(msg.timestamp);

            return (
              <div key={msg.id} className="flex gap-3">
                <div className="avatar">
                  {msg.senderName ? msg.senderName.charAt(0).toUpperCase() : "U"}
                </div>

                <div className="bg-white message-card rounded px-4 py-2 max-w-xl w-full">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span className="font-semibold text-gray-700">
                      {msg.senderName}
                    </span>
                    <span>{time}</span>
                  </div>

                  <div className="text-sm">{msg.content}</div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef}></div>
        </div>

        <div className="border-t bg-white p-3 flex gap-2">
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            className="flex-1 border rounded px-3 py-2"
            placeholder="Type a message"
          />
          <button
            onClick={sendMessage}
            className="text-white px-4 rounded"
            style={{ backgroundColor: "#6264a7" }}
          >
            Send
          </button>
        </div>
      </div>

      {isPrivateRoom && (
        <div className="w-64 border-l bg-[#f3f2f1] p-4">
          <div className="flex justify-between items-center mb-3">
            <div className="font-semibold">Members</div>

            <button
              onClick={handleInviteMemberClick}
              className="text-xs text-white px-2 py-1 rounded relative z-10"
              style={{ backgroundColor: "#6264a7" }}
            >
              Invite
            </button>
          </div>

          <div className="space-y-2">
            {members?.map(m => (
              <div key={m?.userId} className="flex items-center gap-2 text-sm">
                <div className="avatar">
                  {m?.username ? m.username.charAt(0).toUpperCase() : "U"}
                </div>
                {m?.username}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [user, setUser] = useState(
    token ? decodeUser(token) : { id: null, username: "" }
  );

  useEffect(() => {
    if (token) {
      setUser(decodeUser(token));
    }
  }, [token]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    setToken(null);
  };

  if (!token) {
    return <AuthPage setToken={setToken} />;
  }

  return (
    <Chat
      token={token}
      user={user}
      onLogout={handleLogout}
    />
  );
}

export default App;
