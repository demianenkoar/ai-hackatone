import Message from "./Message";
import MessageInput from "./MessageInput";

export default function ChatArea({ messages, text, setText, sendMessage }) {
  return (
    <div className="flex-1 flex flex-col">

      <div className="teams-header p-3 font-semibold">
        Chat
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#f3f2f1]">
        {messages.map(msg => (
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
