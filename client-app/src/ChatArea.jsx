import { useEffect, useRef, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import Message from "./Message";
import MessageInput from "./MessageInput";
import InviteMemberModal from "./InviteMemberModal";

const API_BASE = "http://localhost:58097";

function getCurrentUsername() {
  try {
    const token = localStorage.getItem("token");
    if (!token) return "User";
    const payload = JSON.parse(atob(token.split(".")[1]));
    return (
      payload.unique_name ||
      payload.name ||
      payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"] ||
      "User"
    );
  } catch {
    return "User";
  }
}

function getCurrentUserId() {
  try {
    const token = localStorage.getItem("token");
    const payload = JSON.parse(atob(token.split(".")[1]));
    return (
      payload.nameid ||
      payload.sub ||
      payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"]
    );
  } catch {
    return null;
  }
}

export default function ChatArea({
  messages,
  setMessages,
  text,
  setText,
  sendMessage,
  connectionRef,
  setCurrentRoom,
  isConnected
}) {

  const { channelId } = useParams();
  const username = getCurrentUsername();
  const currentUserId = getCurrentUserId();

  const safeMessages = messages || [];

  const [replyTo, setReplyTo] = useState(null);

  const [activeTab, setActiveTab] = useState("chat");
  const [files, setFiles] = useState([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const containerRef = useRef(null);
  const messagesEndRef = useRef(null);

  const loadingRef = useRef(false);
  const prevHeightRef = useRef(0);
  const isPrependingRef = useRef(false);

  const previousRoomRef = useRef(null);

  const typingTimeoutsRef = useRef({});
  const [typingUsers, setTypingUsers] = useState({});

  const [members, setMembers] = useState([]);
  const [showMembers, setShowMembers] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [channel, setChannel] = useState(null);

  const isOwner =
    channel?.ownerId &&
    String(channel.ownerId) === String(currentUserId);

  const isPrivateChannel =
    !channel ||
    channel?.isPrivate ||
    channel?.type === "private" ||
    channel?.privacy === 1 ||
    channel?.isPublic === false;

  async function searchMessages(query) {
    const token = localStorage.getItem("token");
    if (!query.trim()) {
      setIsSearching(false);
      return;
    }

    try {
      const res = await fetch(
        `${API_BASE}/api/messages/${channelId}/search?q=${encodeURIComponent(query)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (!res.ok) return;

      const data = await res.json();
      setSearchResults(data);
      setIsSearching(true);
    } catch (err) {
      console.error("Search failed", err);
    }
  }

  async function fetchFiles() {
    const token = localStorage.getItem("token");
    if (!channelId) return;

    try {
      const res = await fetch(`${API_BASE}/api/messages/${channelId}/files`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) return;

      const data = await res.json();
      setFiles(data);
    } catch (err) {
      console.error("Failed to fetch files", err);
    }
  }

  useEffect(() => {
    if (activeTab === "files") {
      fetchFiles();
    }
  }, [activeTab, channelId]);

  useEffect(() => {
    if (!channelId) return;

    console.log("Room changed, setting current room:", channelId);
    setCurrentRoom(channelId);

  }, [channelId, setCurrentRoom]);

  useEffect(() => {
    const connection = connectionRef.current;
    if (!connection) return;

    const typingHandler = (typingUsername, roomId) => {
      if (String(roomId) !== String(channelId)) return;

      setTypingUsers(prev => ({
        ...prev,
        [roomId]: typingUsername
      }));

      if (typingTimeoutsRef.current[roomId]) {
        clearTimeout(typingTimeoutsRef.current[roomId]);
      }

      typingTimeoutsRef.current[roomId] = setTimeout(() => {
        setTypingUsers(prev => {
          const copy = { ...prev };
          delete copy[roomId];
          return copy;
        });
      }, 4000);
    };

    connection.on("UserTyping", typingHandler);

    return () => {
      connection.off("UserTyping", typingHandler);
    };

  }, [connectionRef, channelId]);

  useEffect(() => {
    const connection = connectionRef.current;
    if (!connection || !isConnected || !channelId) return;

    async function switchRooms() {
      try {
        if (previousRoomRef.current) {
          await connection.invoke("LeaveRoom", previousRoomRef.current);
        }

        await connection.invoke("JoinRoom", channelId);

        previousRoomRef.current = channelId;
      } catch (err) {
        console.error("SignalR room switch failed", err);
      }
    }

    switchRooms();

  }, [channelId, connectionRef, isConnected]);

  const fetchMembers = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!channelId || !token) return;

    try {
      const res = await fetch(`${API_BASE}/api/rooms/${channelId}/members`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) return;

      const data = await res.json();
      setMembers(data);
    } catch (err) {
      console.error("Failed to fetch members", err);
    }
  }, [channelId]);

  useEffect(() => {
    const connection = connectionRef.current;
    if (!connection) return;

    const memberHandler = (newMember) => {
      console.log("SignalR: MemberAdded", newMember);

      setMembers(prev => {
        const exists = prev.some(m => String(m.userId) === String(newMember.userId));
        if (exists) return prev;
        return [...prev, newMember];
      });
    };

    const removedHandler = ({ userId }) => {
      setMembers(prev =>
        prev.filter(m => String(m.userId) !== String(userId))
      );
    };

    connection.on("MemberAdded", memberHandler);
    connection.on("MemberRemoved", removedHandler);

    return () => {
      connection.off("MemberAdded", memberHandler);
      connection.off("MemberRemoved", removedHandler);
    };

  }, [connectionRef]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!channelId || !token) return;

    async function fetchChannel() {
      const res = await fetch(`${API_BASE}/api/rooms`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json();
      const current = data.find(c => String(c.id) === String(channelId));
      setChannel(current);
    }

    fetchChannel();
  }, [channelId]);

  useEffect(() => {
    fetchMembers();
  }, [channelId, fetchMembers]);

  useEffect(() => {
    const token = localStorage.getItem("token");

    setSearchQuery("");
    setIsSearching(false);
    setSearchResults([]);

    if (!channelId || !token) return;

    async function fetchMessages() {
      try {
        const res = await fetch(`${API_BASE}/api/messages/${channelId}?limit=20&t=${Date.now()}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (!res.ok) return;

        const data = await res.json();
        setMessages(data);

      } catch {}
    }

    setMessages([]);
    fetchMessages();

  }, [channelId, setMessages]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    if (isPrependingRef.current) {
      const newHeight = el.scrollHeight;
      el.scrollTop = newHeight - prevHeightRef.current;
      isPrependingRef.current = false;
      return;
    }

    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

  }, [messages]);

  async function loadOlderMessages() {
    if (loadingRef.current) return;
    if (!safeMessages.length) return;

    const token = localStorage.getItem("token");
    const oldest = safeMessages[0]?.timestamp;
    if (!oldest) return;

    loadingRef.current = true;

    const el = containerRef.current;
    if (el) prevHeightRef.current = el.scrollHeight;

    try {
      const res = await fetch(
        `${API_BASE}/api/messages/${channelId}?before=${encodeURIComponent(oldest)}&limit=20`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (!res.ok) {
        loadingRef.current = false;
        return;
      }

      const data = await res.json();

      if (data.length > 0) {
        isPrependingRef.current = true;
        setMessages(prev => [...data, ...prev]);
      }

    } catch {}

    loadingRef.current = false;
  }

  function handleScroll() {
    const el = containerRef.current;
    if (!el) return;

    if (el.scrollTop === 0) {
      loadOlderMessages();
    }
  }

  async function inviteUser(roomId, userId) {
    const token = localStorage.getItem("token");

    if (!userId) return;

    try {
      const res = await fetch(`${API_BASE}/api/rooms/${roomId}/add-user/${userId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("Invite failed:", text);
        return;
      }
    } catch (err) {
      console.error("Invite request failed:", err);
    }
  }

  async function deleteRoom() {
    if (!channelId) return;

    const confirmed = window.confirm("Delete this room permanently?");
    if (!confirmed) return;

    const token = localStorage.getItem("token");

    const res = await fetch(`${API_BASE}/api/rooms/${channelId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (res.ok) {
      window.location.href = "/";
    }
  }

  async function kickUser(userId) {
    if (!channelId) return;

    const confirmed = window.confirm("Kick this user from the room?");
    if (!confirmed) return;

    const token = localStorage.getItem("token");

    try {
      const res = await fetch(
        `${API_BASE}/api/rooms/${channelId}/kick/${userId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (!res.ok) {
        console.error("Kick failed");
        return;
      }

      setMembers(prev =>
        prev.filter(m => String(m.userId) !== String(userId))
      );

    } catch (err) {
      console.error("Kick request failed", err);
    }
  }

  const typingMessage = typingUsers[channelId];

  return (
    <div className="flex-1 flex">

      <div className="flex-1 flex flex-col">

        <div className="teams-header p-3 font-semibold flex justify-between items-center">
          <div className="flex items-center gap-4">

            <div className="flex gap-3">
              <button
                onClick={() => setActiveTab("chat")}
                className={`text-sm ${activeTab === "chat" ? "font-bold underline" : ""}`}
              >
                Chat
              </button>

              <button
                onClick={() => setActiveTab("files")}
                className={`text-sm ${activeTab === "files" ? "font-bold underline" : ""}`}
              >
                Files
              </button>
            </div>

            <input
              value={searchQuery}
              onChange={(e) => {
                const v = e.target.value;
                setSearchQuery(v);
                searchMessages(v);
              }}
              placeholder="Search messages..."
              className="ml-4 text-sm px-2 py-1 rounded border text-black"
            />

          </div>

          {channel?.ownerId === currentUserId && (
            <button
              onClick={deleteRoom}
              className="text-xs bg-red-500 text-white px-2 py-1 rounded"
            >
              Delete Room
            </button>
          )}

          <button
            onClick={() => setShowMembers(!showMembers)}
            className="text-xs bg-white text-black px-2 py-1 rounded"
          >
            Members
          </button>
        </div>

        {activeTab === "chat" && (
        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#f3f2f1]"
        >
          {(isSearching ? searchResults : safeMessages).map((msg) => (
            <Message
              key={msg.id}
              msg={msg}
              previousMessage={(isSearching ? searchResults : safeMessages)[
                (isSearching ? searchResults : safeMessages).findIndex(m => m.id === msg.id) - 1
              ]}
              onReply={(m) => {
                setReplyTo(m);
                setTimeout(() => {
                  document.querySelector("input[placeholder='Type a message']")?.focus();
                }, 50);
              }}
            />
          ))}

          <div ref={messagesEndRef} />
        </div>
        )}

        {activeTab === "files" && (
          <div className="flex-1 overflow-y-auto p-6 bg-[#f3f2f1]">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">

              {files.map(file => (
                <div
                  key={file.id}
                  className="border border-slate-200 bg-white p-3 rounded-xl shadow-sm hover:shadow-md transition"
                >
                  <div className="text-sm font-medium truncate mb-1">
                    {file.fileName}
                  </div>

                  <div className="text-xs text-gray-500 mb-2">
                    {file.senderName}
                  </div>

                  <a
                    href={`http://localhost:58097${file.url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 text-xs underline"
                  >
                    Download
                  </a>
                </div>
              ))}

              {files.length === 0 && (
                <div className="text-gray-500 text-sm">
                  No files shared in this room yet.
                </div>
              )}

            </div>
          </div>
        )}

        {typingMessage && (
          <div className="text-sm text-gray-500 px-4 pb-1">
            {typingMessage} is typing...
          </div>
        )}

        {activeTab === "chat" && (
        <MessageInput
          text={text}
          setText={setText}
          sendMessage={() => sendMessage(replyTo)}
          roomId={channelId}
          username={username}
          connectionRef={connectionRef}
          replyTo={replyTo}
          clearReply={() => setReplyTo(null)}
        />
        )}

      </div>

      {showMembers && (
        <div className="w-64 border-l bg-white flex flex-col">

          <div className="p-4 border-b">
            <div className="font-semibold mb-3">
              Members
            </div>

            {isPrivateChannel && (
              <button
                onClick={() => setShowInvite(true)}
                className="w-full flex items-center justify-center gap-2 text-sm border rounded py-2"
                style={{
                  borderColor: "#6264a7",
                  color: "#6264a7",
                  background: "transparent"
                }}
              >
                + Add people
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4">

            {isPrivateChannel ? (
              members.map(m => (
                <div key={m.userId} className="flex items-center justify-between mb-2">

                  <div className="flex items-center gap-2">
                    <div className="avatar">
                      {m.username?.charAt(0).toUpperCase()}
                    </div>

                    <span className="text-sm">
                      {m.username}
                      {m.role === 0 && (
                        <span className="ml-2 text-xs text-gray-500">(owner)</span>
                      )}
                    </span>
                  </div>

                  {isOwner && m.role !== 0 && (
                    <button
                      onClick={() => kickUser(m.userId)}
                      className="text-xs text-red-500 border border-red-500 px-2 py-0.5 rounded hover:bg-red-500 hover:text-white"
                    >
                      Kick
                    </button>
                  )}

                </div>
              ))
            ) : (
              members
                .filter(m => m.isOwner)
                .map(m => (
                  <div key={m.userId} className="flex items-center gap-2 mb-2">

                    <div className="avatar">
                      {m.username?.charAt(0).toUpperCase()}
                    </div>

                    <span className="text-sm">
                      {m.username}
                      <span className="ml-2 text-xs text-gray-500">(owner)</span>
                    </span>

                  </div>
                ))
            )}

          </div>

        </div>
      )}

      {showInvite && (
        <InviteMemberModal
          roomId={channelId}
          inviteUser={inviteUser}
          onMemberAdded={fetchMembers}
          close={() => setShowInvite(false)}
        />
      )}

    </div>
  );
}
