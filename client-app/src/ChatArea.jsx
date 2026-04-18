import { useEffect } from "react";
import { useParams } from "react-router-dom";
import Message from "./Message";
import MessageInput from "./MessageInput";

export default function ChatArea({
  messages,
  setMessages,
  text,
  setText,
  sendMessage,
  connectionRef
}) {

  const { channelId } = useParams();

  console.log("Active channel:", channelId);
  console.log("Messages in ChatArea:", messages);

  const safeMessages = messages || [];

  useEffect(() => {
    if (!channelId) return;

    async function fetchMessages() {
      try {
        const res = await fetch(`/api/messages/${channelId}?limit=20`);
        const data = await res.json();
        setMessages(data || []);
      } catch (err) {
        console.error("Failed to fetch messages:", err);
      }
    }

    fetchMessages();

    if (connectionRef?.current) {
      connectionRef.current.invoke("JoinRoom", channelId)
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
