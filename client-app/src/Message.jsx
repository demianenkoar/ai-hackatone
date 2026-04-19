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

export default function Message({ msg, onReply }) {
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
      onDoubleClick={onReply}
      className="flex flex-col"
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
          backgroundColor: isMine ? "#e5e5f1" : "#ffffff",
          border: isMine ? "none" : "1px solid #e1e1e1",
          borderRadius: "10px",
          borderBottomRightRadius: isMine ? "0px" : "10px",
          borderBottomLeftRadius: isMine ? "10px" : "0px",
          color: "#1f2937"
        }}
      >
        {msg.replyTo && (
          <div className="border-l-4 border-gray-300 pl-2 mb-1 text-xs text-gray-600">
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
          className="text-xs text-gray-500 mt-1"
          style={{ textAlign: "right" }}
        >
          {time}
        </div>
      </div>
    </div>
  );
}
