import { useEffect, useRef, useState } from "react";
import * as signalR from "@microsoft/signalr";

const API_BASE = "http://localhost:58097";

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
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [inviteUserId, setInviteUserId] = useState("");

  const connectionRef = useRef(null);

  const loadChannels = () => {
    fetch(`${API_BASE}/api/channels`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(setChannels);
  };

  useEffect(() => {
    loadChannels();
  }, []);

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

    connection.on("RoomAdded", (roomId) => {
      loadChannels();
    });

    connection.start();

    connectionRef.current = connection;

    return () => connection.stop();
  }, [token, selectedChannel]);

  const createChannel = async () => {
    await fetch(`${API_BASE}/api/rooms`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        name: newChannelName,
        isPublic
      })
    });

    setShowCreate(false);
    setNewChannelName("");
    loadChannels();
  };

  const inviteUser = async () => {
    await fetch(
      `${API_BASE}/api/rooms/add-user?roomId=${selectedChannel}&userId=${inviteUserId}`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    setInviteUserId("");
  };

  const sendMessage = async () => {
    if (!text.trim()) return;
    await connectionRef.current.invoke("SendMessage", selectedChannel, text);
    setText("");
  };

  return (
    <div className="w-full h-screen flex overflow-hidden">
      <div className="w-64 bg-slate-100 border-r border-slate-200 p-4 flex flex-col">
        <div className="font-semibold mb-1">Channels</div>
        <div className="text-xs text-slate-500 mb-4">
          Logged in as: {user.username}
        </div>

        <button
          onClick={() => setShowCreate(true)}
          className="text-xs bg-blue-600 text-white rounded px-2 py-1 mb-3"
        >
          + Create Channel
        </button>

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
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
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

        {selectedChannel && (
          <div className="border-t p-3 flex gap-2">
            <input
              placeholder="Invite userId"
              value={inviteUserId}
              onChange={e => setInviteUserId(e.target.value)}
              className="border px-2 py-1 rounded text-sm"
            />
            <button
              onClick={inviteUser}
              className="text-sm bg-slate-800 text-white px-2 rounded"
            >
              Invite
            </button>
          </div>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40">
          <div className="bg-white p-6 rounded-xl shadow-xl w-80 space-y-3">
            <h3 className="font-semibold">Create Channel</h3>

            <input
              value={newChannelName}
              onChange={e => setNewChannelName(e.target.value)}
              placeholder="Channel name"
              className="w-full border rounded px-3 py-2"
            />

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
              />
              Make this channel public
            </label>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowCreate(false)}
                className="text-sm"
              >
                Cancel
              </button>
              <button
                onClick={createChannel}
                className="bg-blue-600 text-white px-3 py-1 rounded"
              >
                Create
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
