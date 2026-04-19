import { useState, useRef } from "react";
import EmojiPicker from "emoji-picker-react";

const API_BASE = "http://localhost:58097";

export default function MessageInput({ text, setText, sendMessage }) {
  const [showPicker, setShowPicker] = useState(false);
  const fileInputRef = useRef(null);

  function handleEmojiClick(emojiData) {
    setText((prev) => prev + emojiData.emoji);
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
        onChange={(e) => setText(e.target.value)}
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
  );
}
