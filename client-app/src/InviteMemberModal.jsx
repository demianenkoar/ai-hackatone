import { useEffect, useState } from "react";

const API_BASE = "http://localhost:58097";

export default function InviteMemberModal({ roomId, inviteUser, close }) {

  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    const handle = setTimeout(async () => {
      const token = localStorage.getItem("token");

      try {
        const res = await fetch(
          `${API_BASE}/api/users/search?query=${encodeURIComponent(query)}`,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );

        if (!res.ok) return;

        const data = await res.json();
        setResults(data);
        setShowDropdown(true);
      } catch (err) {
        console.error("User search failed", err);
      }
    }, 300);

    return () => clearTimeout(handle);

  }, [query]);

  function selectUser(user) {
    setQuery(user.username);
    setSelectedUserId(user.id);
    setShowDropdown(false);
  }

  function handleInvite() {
    if (!selectedUserId) return;
    inviteUser(roomId, selectedUserId);
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">

      <div className="bg-white w-80 rounded shadow-lg">

        <div
          className="px-4 py-2 border-b font-semibold"
          style={{ backgroundColor: "#f5f5f5" }}
        >
          Invite Member
        </div>

        <div className="p-4 relative">

          <input
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setSelectedUserId(null);
            }}
            placeholder="Search user..."
            className="w-full border rounded px-3 py-2 mb-2"
          />

          {showDropdown && results.length > 0 && (
            <div className="absolute left-4 right-4 bg-white border rounded shadow z-10">

              {results.map(user => (
                <div
                  key={user.id}
                  onClick={() => selectUser(user)}
                  className="px-3 py-2 cursor-pointer hover:bg-gray-100"
                >
                  <div className="text-sm font-medium">
                    {user.username}
                  </div>
                  <div className="text-xs text-gray-500">
                    {user.email}
                  </div>
                </div>
              ))}

            </div>
          )}

          <div className="flex justify-end gap-2 mt-4">
            <button onClick={close}>
              Cancel
            </button>

            <button
              onClick={handleInvite}
              className="text-white px-3 py-1 rounded"
              style={{ backgroundColor: "#6264a7" }}
            >
              Add
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
