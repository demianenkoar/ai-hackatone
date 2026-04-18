import { useEffect } from "react";
import { useParams } from "react-router-dom";
import Message from "./Message";
import MessageInput from "./MessageInput";

const API_BASE = "https://localhost:58097";

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

  return (
    <div className="flex-1 flex flex-col">

      <div className="teams-header p-3 font-semibold">
        Chat
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#f3f2f1]">
        {safeMessages.map((msg) => (
          <Message key={msg.id} msg={msg} />
        ))}
      </div>

      <MessageInput
        text={text}
        setText={setText}
        sendMessage={sendMessage}
      />

    </div>
  );
}
