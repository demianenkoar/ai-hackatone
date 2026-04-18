export default function MessageInput({ text, setText, sendMessage }) {
  return (
    <div className="border-t bg-white p-3 flex gap-2">
      <input
        value={text}
        onChange={e => setText(e.target.value)}
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
