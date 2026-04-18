import React from "react";
import MessageList from "./MessageList";

export default function App() {
  const roomId = "11111111-1111-1111-1111-111111111111";

  return (
    <div style={{ width: "600px", margin: "40px auto", fontFamily: "Arial" }}>
      <h2>React Chat</h2>
      <MessageList roomId={roomId} />
    </div>
  );
}
