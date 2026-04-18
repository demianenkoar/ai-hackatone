import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Message from "./Message";
import MessageInput from "./MessageInput";
import InviteMemberModal from "./InviteMemberModal";

const API_BASE = "http://localhost:58097";

export default function ChatArea({
  messages,
  setMessages,
  text,
  setText,
  sendMessage,
  connectionRef
}) {

  const { channelId } = useParams();

  const safeMessages = messages || [];

  const containerRef = useRef(null);
  const messagesEndRef = useRef(null);

  const loadingRef = useRef(false);
  const prevHeightRef = useRef(0);
  const isPrependingRef = useRef(false);

  const [members, setMembers] = useState([]);
  const [showMembers, setShowMembers] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [channel, setChannel] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!channelId || !token) return;

    async function fetchChannel() {
      const res = await fetch(`${API_BASE}/api/channels`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json();
      const current = data.find(c => String(c.id) === String(channelId));
      setChannel(current);
    }

    fetchChannel();
  }, [channelId]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!channelId || !token) return;

    async function fetchMembers() {
      const res = await fetch(`${API_BASE}/api/rooms/${channelId}/members`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) return;

      const data = await res.json();
      setMembers(data);
    }

    if (channel?.isPrivate === true) {
      fetchMembers();
    }

  }, [channelId, channel]);

  useEffect(() => {
    const token = localStorage.getItem("token");

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

    if (connectionRef?.current) {
      connectionRef.current
        .invoke("JoinRoom", channelId)
        .catch(() => {});
    }

  }, [channelId]);

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

  async function inviteUser(roomId, identifier) {
    const token = localStorage.getItem("token");

    await fetch(`${API_BASE}/api/rooms/${roomId}/members`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ identifier })
    });

    setShowInvite(false);
  }

  return (
    <div className="flex-1 flex">

      <div className="flex-1 flex flex-col">

        <div className="teams-header p-3 font-semibold flex justify-between items-center">

          <span>Chat</span>

          <div className="flex gap-2">

            {channel?.isPrivate === true && (
              <button
                onClick={() => setShowInvite(true)}
                className="text-white px-3 py-1 rounded text-sm"
                style={{ backgroundColor: "#6264a7" }}
              >
                Invite Member
              </button>
            )}

            {channel?.isPrivate === true && (
              <button
                onClick={() => setShowMembers(!showMembers)}
                className="text-xs bg-white text-black px-2 py-1 rounded"
              >
                Members
              </button>
            )}

          </div>

        </div>

        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#f3f2f1]"
        >
          {safeMessages.map((msg) => (
            <Message key={msg.id} msg={msg} />
          ))}

          <div ref={messagesEndRef} />
        </div>

        <MessageInput
          text={text}
          setText={setText}
          sendMessage={sendMessage}
        />

      </div>

      {showMembers && channel?.isPrivate === true && (
        <div className="w-64 border-l bg-white p-4 overflow-y-auto">

          <div className="font-semibold mb-3">
            Members
          </div>

          {members.map(m => (
            <div key={m.id} className="flex items-center gap-2 mb-2">

              <div className="avatar">
                {m.username?.charAt(0).toUpperCase()}
              </div>

              <span className="text-sm">{m.username}</span>

            </div>
          ))}

        </div>
      )}

      {showInvite && (
        <InviteMemberModal
          roomId={channelId}
          inviteUser={inviteUser}
          close={() => setShowInvite(false)}
        />
      )}

    </div>
  );
}
