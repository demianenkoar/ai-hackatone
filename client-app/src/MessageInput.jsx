import { useState, useRef } from "react";
import EmojiPicker from "emoji-picker-react";

const API_BASE = "http://localhost:58097";

export default function MessageInput({
  text,
  setText,
  sendMessage,
  roomId,
  username,
  connectionRef,
  replyTo,
  clearReply
}) {
  const [showPicker, setShowPicker] = useState(false);
  const fileInputRef = useRef(null);
  const lastTypingSentRef = useRef(0);

  function handleEmojiClick(emojiData) {
    setText((prev) => prev + emojiData.emoji);
  }

  function handleTextChange(e) {
    const value = e.target.value;
    setText(value);

    const now = Date.now();

    if (now - lastTypingSentRef.current > 2500) {
      const connection = connectionRef?.current;
      if (connection && roomId && username) {
        connection.invoke("SendTyping", roomId, username).catch(console.error);
        lastTypingSentRef.current = now;
      }
    }
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const token = localStorage.getItem("token");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${API_BASE}/api/messages/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      if (!res.ok) {
        console.error("Upload failed");
        return;
      }

      const data = await res.json();
      const url = data.url;

      if (!url) return;

      setText(url);

      setTimeout(() => {
        sendMessage();
      }, 0);

    } catch (err) {
      console.error("Upload error", err);
    }

    e.target.value = "";
  }

  return (
    <>
      {replyTo && (
        <div className="border-l-4 border-[#6264a7] bg-gray-50 px-3 py-2 text-sm mb-2">
          <div className="text-xs text-gray-500">
            Replying to {replyTo.senderName}
          </div>
          <div className="truncate">{replyTo.content}</div>
          <button
            onClick={clearReply}
            className="text-xs text-red-500 mt-1"
          >
            Cancel
          </button>
        </div>
      )}

      <div className="border-t bg-white p-3 flex gap-2 relative">
        <button
          type="button"
          onClick={() => setShowPicker((v) => !v)}
          className="px-2 text-lg"
        >
          🙂
        </button>

        {showPicker && (
          <div
            className="absolute bottom-14 left-2 z-50 shadow-lg"
          >
            <EmojiPicker onEmojiClick={handleEmojiClick} />
          </div>
        )}

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="px-2 text-lg"
          title="Attach file"
        >
          📎
        </button>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          style={{ display: "none" }}
        />

        <input
          value={text}
          onChange={handleTextChange}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          className="flex-1 border rounded px-3 py-2"
          placeholder="Type a message"
        />

        <button
          onClick={sendMessage}
          className="text-white px-4 rounded"
          style={{ backgroundColor: "#6264a7" }}
        >
          Send
        </button>
      </div>
    </>
  );
}
