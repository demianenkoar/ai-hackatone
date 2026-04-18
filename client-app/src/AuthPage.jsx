import { useState } from "react";

const API_BASE = "http://localhost:58097";

export default function AuthPage({ setToken }) {
  const [isRegistering, setIsRegistering] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [message, setMessage] = useState("");

  const login = async () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      setMessage("Email and password are required");
      return;
    }

    const response = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email: normalizedEmail,
        password: password
      })
    });

    const data = await response.json().catch(() => ({}));

    console.log("Login response:", data);

    if (!response.ok) {
      console.error("Login error detail:", data);
      setMessage("Login failed");
      return;
    }

    const token = data.token;

    if (!token) {
      console.error("No token found in login response");
      setMessage("Invalid login response");
      return;
    }

    localStorage.setItem("token", token);

    console.log("Token saved:", localStorage.getItem("token"));

    setToken(token);
  };

  const register = async () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      setMessage("Email and password are required");
      return;
    }

    const response = await fetch(`${API_BASE}/api/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email: normalizedEmail,
        password: password
      })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error("Registration error detail:", data);
      setMessage("Registration failed");
      return;
    }

    console.log("Registration successful, logging in...");

    await login();
  };

  const handleSubmit = () => {
    if (isRegistering) {
      register();
    } else {
      login();
    }
  };

  return (
    <div className="w-full h-screen flex items-center justify-center bg-slate-100">
      <div className="bg-white p-8 rounded shadow w-80 border border-[#e1dfdd] min-h-[300px] flex flex-col">

        <h2 className="text-xl font-semibold mb-4">
          {isRegistering ? "Create account" : "Sign in"}
        </h2>

        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="w-full border px-3 py-2 rounded mb-3"
        />

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full border px-3 py-2 rounded mb-4"
        />

        <button
          onClick={handleSubmit}
          className="w-full text-white py-2 rounded mb-3"
          style={{ backgroundColor: "#6264a7" }}
        >
          {isRegistering ? "Register" : "Sign in"}
        </button>

        {message && (
          <div className="text-sm text-gray-600 mb-2">
            {message}
          </div>
        )}

        <div className="text-sm mt-auto">
          {isRegistering ? (
            <span>
              Already have an account?{" "}
              <button
                onClick={() => {
                  setIsRegistering(false);
                  setMessage("");
                }}
                className="hover:underline"
                style={{ color: "#6264a7" }}
              >
                Sign in
              </button>
            </span>
          ) : (
            <span>
              No account?{" "}
              <button
                onClick={() => {
                  setIsRegistering(true);
                  setMessage("");
                }}
                className="hover:underline"
                style={{ color: "#6264a7" }}
              >
                Create one!
              </button>
            </span>
          )}
        </div>

      </div>
    </div>
  );
}
