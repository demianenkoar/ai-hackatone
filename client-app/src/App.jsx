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
  const connectionRef = useRef(null);

  const loadChannels = async () => {
    const res = await fetch(`${API_BASE}/api/channels`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const data = await res.json();
    setChannels(data);

    // If no room selected yet, auto-select General
    if (!selectedChannel && data.length > 0) {
      const general = data.find(r => r.title?.toLowerCase() === "general");
      if (general) {
        setSelectedChannel(general.id);
      } else {
        setSelectedChannel(data[0].id);
      }
    }
  };

  const loadMessages = async (roomId) => {
    if (!roomId) return;

    console.log("Fetching messages for room:", roomId);

    const res = await fetch(`${API_BASE}/api/messages/${roomId}`);
    const data = await res.json();

    console.log("Messages received:", data);

    setMessages(data);
  };

  useEffect(() => {
    loadChannels();
  }, []);

  useEffect(() => {
    if (selectedChannel) {
      loadMessages(selectedChannel);
    }
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

    connection.start().then(() => {
      console.log("SignalR connected");

      if (selectedChannel) {
        connection.invoke("JoinRoom", selectedChannel);
      }
    });

    connectionRef.current = connection;

    return () => connection.stop();
  }, [token, selectedChannel]);

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
      </div>
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
