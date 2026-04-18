function formatTimestamp(ts) {
  if (!ts) return "";
  const d = new Date(ts);

  return d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });
}

export default function Message({ msg }) {
  const time = formatTimestamp(msg.timestamp);

  return (
    <div className="flex gap-3">
      <div className="avatar">
        {msg.senderName ? msg.senderName.charAt(0).toUpperCase() : "U"}
      </div>

      <div className="bg-white message-card rounded px-4 py-2 max-w-xl w-full">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span className="font-semibold text-gray-700">
            {msg.senderName}
          </span>
          <span>{time}</span>
        </div>

        <div className="text-sm">{msg.content}</div>
      </div>
    </div>
  );
}
