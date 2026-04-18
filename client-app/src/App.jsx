import { useEffect, useRef, useState } from "react";
import * as signalR from "@microsoft/signalr";

import Sidebar from "./Sidebar";
import ChatArea from "./ChatArea";
import AuthPage from "./AuthPage";
import CreateRoomModal from "./CreateRoomModal";
import InviteMemberModal from "./InviteMemberModal";

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

function App() {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [user, setUser] = useState(
    token ? decodeUser(token) : { id: null, username: "" }
  );

  const [channels, setChannels] = useState([]);
  const [currentRoomId, setCurrentRoomId] = useState(null);

  const [messages, setMessages] = useState([]);
  const [members, setMembers] = useState([]);

  const [text, setText] = useState("");
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

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

    if (!currentRoomId && data.length > 0) {
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

  const handleLogout = () => {
    localStorage.removeItem("token");
    setToken(null);
  };

  if (!token) {
    return <AuthPage setToken={setToken} />;
  }

  return (
    <div className="w-full h-screen flex overflow-hidden bg-white">

      <Sidebar
        channels={channels}
        currentRoomId={currentRoomId}
        setCurrentRoomId={setCurrentRoomId}
        user={user}
        onLogout={handleLogout}
        onCreateChannel={() => setShowCreateModal(true)}
      />

      <ChatArea
        messages={messages}
        text={text}
        setText={setText}
        sendMessage={sendMessage}
      />

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

export default App;
