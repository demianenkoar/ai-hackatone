import { useState } from "react";

function formatTimestamp(ts) {
  if (!ts) return "";
  const d = new Date(ts);

  return d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function getCurrentUserId() {
  try {
    const token = localStorage.getItem("token");
    if (!token) return null;

    const payload = JSON.parse(atob(token.split(".")[1]));

    return (
      payload.nameid ||
      payload.sub ||
      payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"] ||
      null
    );
  } catch {
    return null;
  }
}

function isImageUrl(url) {
  if (!url) return false;
  const lower = url.toLowerCase();
  return (
    lower.endsWith(".png") ||
    lower.endsWith(".jpg") ||
    lower.endsWith(".jpeg") ||
    lower.endsWith(".gif") ||
    lower.endsWith(".webp")
  );
}

function scrollToMessage(messageId) {
  const el = document.getElementById(`msg-${messageId}`);
  if (!el) return;

  el.scrollIntoView({ behavior: "smooth", block: "center" });

  el.classList.add("message-highlight");

  setTimeout(() => {
    el.classList.remove("message-highlight");
  }, 2000);
}

export default function Message({ msg, onReply }) {
  const [hovered, setHovered] = useState(false);

  const time = formatTimestamp(msg.timestamp);
  const currentUserId = getCurrentUserId();

  const isMine =
    currentUserId &&
    msg.senderId &&
    String(msg.senderId) === String(currentUserId);

  const content = msg.content || "";
  const isImage = isImageUrl(content);
  const isFileLink = content.startsWith("/uploads/");

  return (
    <div
      id={`msg-${msg.id}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="flex flex-col relative transition-all"
      style={{
        alignSelf: isMine ? "flex-end" : "flex-start",
        maxWidth: "60%"
      }}
    >
      {!isMine && (
        <div className="text-xs text-gray-500 mb-1 ml-1">
          {msg.senderName}
        </div>
      )}

      <div
        className="px-4 py-2 text-sm"
        style={{
          backgroundColor: isMine
            ? "#6366f1"
            : hovered
            ? "#eef2ff"
            : "#f8fafc",
          border: isMine ? "none" : "1px solid #e2e8f0",
          borderRadius: "16px",
          borderBottomRightRadius: isMine ? "4px" : "16px",
          borderBottomLeftRadius: isMine ? "16px" : "4px",
          color: isMine ? "white" : "#1f2937",
          boxShadow: "0 1px 2px rgba(0,0,0,0.08)"
        }}
      >
        {hovered && (
          <button
            onClick={() => onReply(msg)}
            className="absolute right-1 top-1 text-gray-400 hover:text-gray-700 text-sm opacity-70 hover:opacity-100 transition-opacity"
            title="Reply"
          >
            ↩
          </button>
        )}

        {msg.replyTo && (
          <div
            onClick={() => scrollToMessage(msg.replyTo.id)}
            className="border-l-4 border-gray-300 pl-2 mb-1 text-xs text-gray-600 cursor-pointer hover:bg-gray-100 transition"
          >
            <div className="font-semibold">{msg.replyTo.senderName}</div>
            <div className="truncate">{msg.replyTo.content}</div>
          </div>
        )}

        {!isFileLink && (
          <div>{content}</div>
        )}

        {isImage && (
          <div className="mt-1">
            <img
              src={`http://localhost:58097${content}`}
              alt="attachment"
              style={{
                maxWidth: "250px",
                borderRadius: "6px"
              }}
            />
          </div>
        )}

        {isFileLink && !isImage && (
          <div className="mt-1">
            <a
              href={`http://localhost:58097${content}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline"
            >
              Download file
            </a>
          </div>
        )}

        <div
          className={`text-xs mt-1 ${isMine ? "text-indigo-200" : "text-gray-500"}`}
          style={{ textAlign: "right" }}
        >
          {time}
        </div>
      </div>
    </div>
  );
}
