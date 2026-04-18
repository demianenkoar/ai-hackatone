import { useEffect, useRef, useState } from "react";
import * as signalR from "@microsoft/signalr";

const API_BASE = "http://localhost:58097";

export default function App() {

  const [token, setToken] = useState(localStorage.getItem("jwt"));
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [channels, setChannels] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [messages, setMessages] = useState([]);

  const connectionRef = useRef(null);
  const selectedChannelRef = useRef(null);

  useEffect(() => {
    selectedChannelRef.current = selectedChannel;
  }, [selectedChannel]);

  const login = async () => {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username,
        passwordHash: password
      })
    });

    const data = await res.json();

    localStorage.setItem("jwt", data.token);
    setToken(data.token);
  };

  useEffect(() => {
    if (!token) return;

    fetch(`${API_BASE}/api/channels`)
      .then(r => r.json())
      .then(data => {
        setChannels(data);
        if (data.length > 0) setSelectedChannel(data[0].id);
      });

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${API_BASE}/chatHub`, {
        accessTokenFactory: () => token
      })
      .withAutomaticReconnect()
      .build();

    connection.on("ReceiveMessage", (message) => {
      if (message.roomId !== selectedChannelRef.current) return;
      setMessages(prev => [...prev, message]);
    });

    connection.start().then(() => {
      if (selectedChannelRef.current)
        connection.invoke("JoinRoom", selectedChannelRef.current);
    });

    connectionRef.current = connection;

    return () => connection.stop();

  }, [token]);

  const sendMessage = async (text) => {
    const connection = connectionRef.current;
    if (!connection) return;

    await connection.invoke("SendMessage", selectedChannel, text);
  };

  if (!token) {
    return (
      <div style={{ padding: 40 }}>
        <h2>Login</h2>
        <input placeholder="Username"
          value={username}
          onChange={e => setUsername(e.target.value)} />
        <br/>
        <input placeholder="Password"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)} />
        <br/>
        <button onClick={login}>Login</button>
      </div>
    );
  }

  return (
    <div>
      <h3>Channels</h3>
      {channels.map(c => (
        <div key={c.id} onClick={() => setSelectedChannel(c.id)}>
          {c.title}
        </div>
      ))}

      <div>
        {messages.map(m => (
          <div key={m.id}>
            <b>{m.senderName}</b>: {m.content}
          </div>
        ))}
      </div>

      <input
        placeholder="Message"
        onKeyDown={(e) => {
          if (e.key === "Enter") sendMessage(e.target.value);
        }}
      />
    </div>
  );
}
