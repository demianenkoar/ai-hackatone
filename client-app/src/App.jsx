import { useEffect, useRef, useState } from "react";
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

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [newRoomName, setNewRoomName] = useState("");
  const [isPublic, setIsPublic] = useState(true);

  const connectionRef = useRef(null);

  useEffect(() => {
    if (token) setUser(decodeUser(token));
  }, [token]);

  const safeFetch = async (url, options = {}) => {
    const res = await fetch(url, options);
    if (res.status === 401) return null;
    return res;
  };

  const loadChannels = async () => {
    const res = await safeFetch(`${API_BASE}/api/channels`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res) return;
    const data = await res.json();

    setChannels(data);
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

  const inviteUser = async (roomId, userId) => {
    const res = await safeFetch(
      `${API_BASE}/api/rooms/${roomId}/add-user/${userId}`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      }
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
      .withUrl(`${API_BASE}/chatHub`, {
        accessTokenFactory: () => token
      })
      .withAutomaticReconnect()
      .build();

    connection.on("ReceiveMessage", (msg) => {
      setMessages(prev => [...prev, msg]);
    });

    connection.start();

    connectionRef.current = connection;

    return () => connection.stop();
  }, [token]);

  const sendMessage = async () => {
    if (!text.trim()) return;

    const path = window.location.pathname;
    const parts = path.split("/");
    const roomId = parts[2];

    if (!roomId) return;

    await connectionRef.current.invoke("SendMessage", roomId, text);
    setText("");
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setToken(null);
  };

  return (
    <div className="w-full h-screen flex overflow-hidden bg-white">

      <Sidebar
        channels={channels}
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
