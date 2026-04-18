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

function Chat({ token, user, onLogout }) {
  const [channels, setChannels] = useState([]);
  const [currentRoomId, setCurrentRoomId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");

  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [isPublic, setIsPublic] = useState(true);

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);

  const connectionRef = useRef(null);
  const containerRef = useRef(null);

  const isNearBottom = () => {
    const container = containerRef.current;
    if (!container) return false;

    return (
      container.scrollHeight - container.scrollTop - container.clientHeight <
      BOTTOM_THRESHOLD
    );
  };

  const scrollToBottom = () => {
    const container = containerRef.current;
    if (!container) return;

    container.scrollTop = container.scrollHeight;
  };

  const loadChannels = async () => {
    const res = await fetch(`${API_BASE}/api/channels`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const data = await res.json();
    setChannels(data);

    if (!currentRoomId && data.length > 0) {
      const general = data.find(r => r.title?.toLowerCase() === "general");
      if (general) {
        setCurrentRoomId(general.id);
      } else {
        setCurrentRoomId(data[0].id);
      }
    }
  };

  const loadMessages = async (roomId) => {
    if (!roomId) return;

    const res = await fetch(`${API_BASE}/api/messages/${roomId}`);
    const data = await res.json();

    setMessages(data);
    setHasMore(data.length === PAGE_SIZE);

    setTimeout(scrollToBottom, 50);
  };

  const loadMoreMessages = async () => {
    if (!currentRoomId) return;
    if (!hasMore || loadingMore || messages.length === 0) return;

    setLoadingMore(true);

    const oldest = messages[0];
    const container = containerRef.current;
    const prevHeight = container ? container.scrollHeight : 0;

    const res = await fetch(
      `${API_BASE}/api/messages/${currentRoomId}?before=${encodeURIComponent(oldest.timestamp)}`
    );

    const older = await res.json();

    if (older.length < PAGE_SIZE) {
      setHasMore(false);
    }

    setMessages(prev => [...older, ...prev]);

    setTimeout(() => {
      if (container) {
        const newHeight = container.scrollHeight;
        container.scrollTop = newHeight - prevHeight;
      }
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

  const searchUsers = async (query) => {
    setSearchQuery(query);

    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    const res = await fetch(
      `${API_BASE}/api/users/search?query=${encodeURIComponent(query)}`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    if (res.status === 401) {
      console.warn("Unauthorized request while searching users");
      return;
    }

    const data = await res.json();
    setSearchResults(data);
  };

  const inviteUser = async (userId) => {
    const res = await fetch(
      `${API_BASE}/api/rooms/${currentRoomId}/add-user/${userId}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    if (res.status === 401) {
      console.warn("Unauthorized invite attempt");
      return;
    }

    alert("User added");
    setShowInviteModal(false);
    setSearchResults([]);
    setSearchQuery("");
  };

  const createChannel = async () => {
    if (!newRoomName.trim()) return;

    await fetch(`${API_BASE}/api/rooms`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        name: newRoomName,
        isPublic
      })
    });

    setShowCreateModal(false);
    setNewRoomName("");
    setIsPublic(true);

    await loadChannels();
  };

  useEffect(() => {
    loadChannels();
  }, []);

  useEffect(() => {
    if (!currentRoomId) return;

    setMessages([]);
    setHasMore(true);

    loadMessages(currentRoomId);
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
        setTimeout(scrollToBottom, 50);
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
  };

  return (
    <div className="w-full h-screen flex overflow-hidden">
      <div className="w-64 bg-slate-100 border-r border-slate-200 p-4 flex flex-col">
        <div className="font-semibold mb-1">Channels</div>
        <div className="text-xs text-slate-500 mb-3">
          Logged in as: {user.username}
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="mb-3 bg-blue-600 text-white text-sm rounded px-3 py-1"
        >
          + Add Channel
        </button>

        <div className="space-y-2 flex-1">
          {channels.map(c => (
            <div
              key={c.id}
              onClick={() => setCurrentRoomId(c.id)}
              className={`p-2 rounded cursor-pointer ${
                currentRoomId === c.id
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
        <div className="border-b p-3 flex justify-between items-center">
          <div className="font-semibold">Chat</div>
          {currentRoomId && (
            <button
              onClick={() => setShowInviteModal(true)}
              className="text-sm bg-green-600 text-white px-3 py-1 rounded"
            >
              Invite
            </button>
          )}
        </div>

        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-4 space-y-4"
        >
          {messages.map(msg => {
            const mine = msg.senderId === user.id;

            return (
              <div
                key={msg.id}
                className={`w-full flex ${mine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={
                    mine
                      ? "bg-blue-600 text-white rounded-2xl rounded-tr-none px-4 py-2 shadow-sm"
                      : "bg-slate-200 text-black rounded-2xl rounded-tl-none px-4 py-2 shadow-sm"
                  }
                >
                  {!mine && (
                    <div className="text-[11px] text-slate-600 mb-1">
                      {msg.senderName}
                    </div>
                  )}
                  {msg.content}
                </div>
              </div>
            );
          })}
        </div>

        <div className="border-t border-slate-200 p-3 flex gap-2">
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") sendMessage();
            }}
            placeholder="Type a message..."
            className="flex-1 border border-slate-200 rounded-lg px-3 py-2"
          />
          <button
            onClick={sendMessage}
            className="bg-blue-600 text-white px-4 rounded-lg"
          >
            Send
          </button>
        </div>
      </div>

      {showInviteModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <div className="bg-white p-6 rounded-xl w-80 shadow-xl">
            <h2 className="font-semibold mb-3">Invite User</h2>

            <input
              value={searchQuery}
              onChange={(e) => searchUsers(e.target.value)}
              placeholder="Search username..."
              className="w-full border border-slate-200 rounded px-3 py-2 mb-3"
            />

            <div className="max-h-40 overflow-y-auto space-y-2">
              {searchResults?.map(u => (
                <div
                  key={u?.id}
                  className="flex justify-between items-center border rounded px-2 py-1"
                >
                  <span>{u?.username}</span>
                  <button
                    onClick={() => inviteUser(u?.id)}
                    className="text-xs bg-blue-600 text-white px-2 py-1 rounded"
                  >
                    Invite
                  </button>
                </div>
              ))}
            </div>

            <div className="flex justify-end mt-4">
              <button
                onClick={() => setShowInviteModal(false)}
                className="text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("jwt"));
  const [user, setUser] = useState(
    token ? decodeUser(token) : { id: null, username: "" }
  );

  const handleLogout = () => {
    localStorage.removeItem("jwt");
    setToken(null);
    setUser({ id: null, username: "" });
  };

  if (!token) {
    return <div>Please login</div>;
  }

  return (
    <Chat
      token={token}
      user={user}
      onLogout={handleLogout}
    />
  );
}
