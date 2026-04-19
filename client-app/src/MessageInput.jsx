import { useState, useRef } from "react";
import EmojiPicker from "emoji-picker-react";

export default function MessageInput({ text, setText, sendMessage }) {
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef(null);

  function handleEmojiClick(emojiData) {
    setText((prev) => prev + emojiData.emoji);
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
          ref={pickerRef}
          className="absolute bottom-14 left-2 z-50 shadow-lg"
        >
          <EmojiPicker onEmojiClick={handleEmojiClick} />
        </div>
      )}

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
