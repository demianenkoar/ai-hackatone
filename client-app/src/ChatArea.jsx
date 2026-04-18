import { useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import Message from "./Message";
import MessageInput from "./MessageInput";

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

  console.log("Active channel:", channelId);
  console.log("Messages in ChatArea:", messages);
  console.log("Rendering messages:", safeMessages.length);

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

        if (!res.ok) {
          console.error("Message fetch failed:", res.status);
          return;
        }

        const data = await res.json();
        setMessages(data);

      } catch (err) {
        console.error("Failed to fetch messages:", err);
      }
    }

    setMessages([]);

    fetchMessages();

    if (connectionRef?.current) {
      connectionRef.current
        .invoke("JoinRoom", channelId)
        .catch(err => console.error("JoinRoom error:", err));
    }

    return () => {
      setMessages([]);
    };

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
    if (el) {
      prevHeightRef.current = el.scrollHeight;
    }

    try {
      const res = await fetch(
        `${API_BASE}/api/messages/${channelId}?before=${encodeURIComponent(oldest)}&limit=20`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
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

    } catch (err) {
      console.error("History load failed:", err);
    }

    loadingRef.current = false;
  }

  function handleScroll() {
    const el = containerRef.current;
    if (!el) return;

    if (el.scrollTop === 0) {
      loadOlderMessages();
    }
  }

  return (
    <div className="flex-1 flex flex-col">

      <div className="teams-header p-3 font-semibold">
        Chat
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
  );
}
