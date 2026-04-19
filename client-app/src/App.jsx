import { useEffect, useRef, useState, useCallback } from "react";
import * as signalR from "@microsoft/signalr";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Sidebar from "./Sidebar";
import ChatArea from "./ChatArea";
import AuthPage from "./AuthPage";
import CreateRoomModal from "./CreateRoomModal";
import InviteMemberModal from "./InviteMemberModal";

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

function AppContent({ token, setToken }) {
  const [user, setUser] = useState(
    token ? decodeUser(token) : { id: null, username: "" }
  );

  const [channels, setChannels] = useState([]);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [unreadCounts, setUnreadCounts] = useState({});

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [newRoomName, setNewRoomName] = useState("");
  const [isPublic, setIsPublic] = useState(true);

  const [isConnected, setIsConnected] = useState(false);

  const connectionRef = useRef(null);
  const currentRoomRef = useRef(null);

  useEffect(() => {
    if (token) setUser(decodeUser(token));
  }, [token]);

  const safeFetch = async (url, options = {}) => {
    const storedToken = localStorage.getItem("token");

    const res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
        Authorization: "Bearer " + storedToken
      }
    });

    if (res.status === 401) {
      console.warn("Unauthorized request:", url);
      return null;
    }

    return res;
  };

  const loadChannels = async () => {
    const res = await safeFetch(`${API_BASE}/api/channels`);
    if (!res) return;

    const data = await res.json();
    setChannels(data);
  };

  const createRoom = async () => {
    if (!newRoomName.trim()) return;

    const res = await safeFetch(`${API_BASE}/api/rooms`, {
      method: "POST",
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

  const inviteUser = async (roomId, userId) => {
    const res = await safeFetch(
      `${API_BASE}/api/rooms/${roomId}/add-user/${userId}`,
      { method: "POST" }
    );

    if (!res) return;

    setShowInviteModal(false);
  };

  useEffect(() => {
    loadChannels();
  }, []);

  useEffect(() => {
    if (!token) return;

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${API_BASE}/chathub`, {
        accessTokenFactory: () => localStorage.getItem("token")
      })
      .withAutomaticReconnect()
      .build();

    connection.on("ReceiveMessage", (message) => {
      console.log("SignalR event received: ReceiveMessage", message);
      console.log("SignalR: New message received", message);

      if (!message) return;

      setMessages((prev) => {
        const exists = prev.some((m) => m.id === message.id);
        if (exists) return prev;
        return [...prev, message];
      });
    });

    connection.on("UnreadIncrement", (roomId) => {
      console.log("SignalR event received: UnreadIncrement", roomId);

      const currentRoom = currentRoomRef.current;

      if (String(roomId) === String(currentRoom)) {
        console.log("Ignoring unread for active room");
        return;
      }

      console.log("Incrementing unread for room:", roomId);

      setUnreadCounts(prev => ({
        ...prev,
        [roomId]: (prev[roomId] || 0) + 1
      }));
    });

    connection.on("NewRoomAdded", (room) => {
      console.log("SignalR: NewRoomAdded", room);

      if (!room) return;

      setChannels((prev) => {
        const exists = prev.some((r) => String(r.id) === String(room.id));
        if (exists) return prev;
        return [...prev, room];
      });
    });

    connection.on("KickedFromRoom", (roomId) => {
      const path = window.location.pathname;
      const parts = path.split("/");
      const currentRoom = parts[2];

      if (String(currentRoom) === String(roomId)) {
        window.location.href = "/";
      }
    });

    connection.onreconnecting((err) => {
      console.log("Reconnecting...", err);
      setIsConnected(false);
    });

    connection.onreconnected(() => {
      console.log("Reconnected!");
      setIsConnected(true);

      if (currentRoomRef.current) {
        console.log("Rejoining room after reconnect:", currentRoomRef.current);
        connection.invoke("JoinRoom", currentRoomRef.current).catch(console.error);
      }
    });

    connection.onclose((err) => {
      console.log("Connection closed.", err);
      setIsConnected(false);
    });

    connection
      .start()
      .then(() => {
        console.log("SignalR: Connected");
        setIsConnected(true);
      })
      .catch((err) => {
        console.error("SignalR connection error:", err);
      });

    connectionRef.current = connection;

    return () => {
      connection.off("ReceiveMessage");
      connection.off("UnreadIncrement");
      connection.off("NewRoomAdded");
      connection.off("KickedFromRoom");
      connection.stop();
    };
  }, [token]);

  const sendMessage = async () => {
    if (!text.trim()) return;

    const path = window.location.pathname;
    const parts = path.split("/");
    const roomId = parts[2];

    if (!roomId || !connectionRef.current || !isConnected) return;

    try {
      await connectionRef.current.invoke("SendMessage", roomId, text);
      setText("");
    } catch (err) {
      console.error("Send failed:", err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setToken(null);
  };

  const setCurrentRoom = useCallback((roomId) => {
    currentRoomRef.current = roomId;

    setUnreadCounts(prev => ({
      ...prev,
      [roomId]: 0
    }));

    if (connectionRef.current && isConnected) {
      console.log("Joining room:", roomId);
      connectionRef.current.invoke("JoinRoom", roomId).catch(console.error);
    }
  }, [isConnected]);

  return (
    <div className="w-full h-screen flex justify-center bg-gray-100">
      <div className="w-full max-w-[1280px] h-screen flex overflow-hidden bg-white shadow-lg border border-gray-300 rounded-lg">

        <Sidebar
          channels={channels}
          unreadCounts={unreadCounts}
          user={user}
          onLogout={handleLogout}
          onCreateChannel={() => setShowCreateModal(true)}
        />

        <Routes>
          <Route
            path="/"
            element={
              channels.length > 0
                ? <Navigate to={`/channel/${channels[0].id}`} />
                : <div className="flex-1 flex items-center justify-center">Select a channel</div>
            }
          />

          <Route
            path="/channel/:channelId"
            element={
              <ChatArea
                messages={messages}
                setMessages={setMessages}
                text={text}
                setText={setText}
                sendMessage={sendMessage}
                connectionRef={connectionRef}
                setCurrentRoom={setCurrentRoom}
                isConnected={isConnected}
              />
            }
          />
        </Routes>

        {showCreateModal && (
          <CreateRoomModal
            newRoomName={newRoomName}
            setNewRoomName={setNewRoomName}
            isPublic={isPublic}
            setIsPublic={setIsPublic}
            createRoom={createRoom}
            close={() => setShowCreateModal(false)}
          />
        )}

        {showInviteModal && (
          <InviteMemberModal
            inviteUser={inviteUser}
            close={() => setShowInviteModal(false)}
          />
        )}

      </div>
    </div>
  );
}

function App() {
  const [token, setToken] = useState(localStorage.getItem("token"));

  if (!token) {
    return <AuthPage setToken={setToken} />;
  }

  return (
    <BrowserRouter>
      <AppContent token={token} setToken={setToken} />
    </BrowserRouter>
  );
}

export default App;
