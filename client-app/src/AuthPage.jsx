import { useState } from "react";

const API_BASE = "https://localhost:58096";

export default function AuthPage({ setToken }) {
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const login = async () => {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ username, password })
    });

    if (!res.ok) {
      alert("Login failed");
      return;
    }

    const data = await res.json();
    const token = data.token || data;

    localStorage.setItem("token", token);
    setToken(token);
  };

  const register = async () => {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ username, password })
    });

    if (!res.ok) {
      alert("Registration failed");
      return;
    }

    await login();
  };

  return (
    <div className="w-full h-screen flex items-center justify-center bg-slate-100">
      <div className="bg-white p-8 rounded shadow w-80 border border-[#e1dfdd]">

        <h2 className="text-xl font-semibold mb-4">
          {mode === "login" ? "Login" : "Register"}
        </h2>

        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Username"
          className="w-full border px-3 py-2 rounded mb-3"
        />

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full border px-3 py-2 rounded mb-4"
        />

        {mode === "login" ? (
          <button
            onClick={login}
            className="w-full text-white py-2 rounded"
            style={{ backgroundColor: "#6264a7" }}
          >
            Login
          </button>
        ) : (
          <button
            onClick={register}
            className="w-full text-white py-2 rounded"
            style={{ backgroundColor: "#6264a7" }}
          >
            Register
          </button>
        )}

      </div>
    </div>
  );
}
