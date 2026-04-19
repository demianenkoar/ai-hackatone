import { useState } from "react";
import ChannelItem from "./ChannelItem";
import RoomControls from "./RoomControls";

const API_BASE = "http://localhost:58097";

export default function Sidebar({
  channels,
  unreadCounts,
  user,
  onLogout,
  onCreateChannel
}) {

  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);

  const publicChannels = channels.filter(c => !(c.isPrivate ?? !c.isPublic));
  const privateChannels = channels.filter(c => (c.isPrivate ?? !c.isPublic));

  const contacts = privateChannels.filter(c => !c.ownerId);
  const privateGroups = privateChannels.filter(c => c.ownerId);

  async function searchUsers(query) {
    const token = localStorage.getItem("token");

    if (!query.trim()) {
      setResults([]);
      return;
    }

    const res = await fetch(
      `${API_BASE}/api/users/search?query=${encodeURIComponent(query)}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!res.ok) return;

    const data = await res.json();
    setResults(data);
  }

  async function startDirectChat(userItem) {
    const token = localStorage.getItem("token");

    const res = await fetch(
      `${API_BASE}/api/rooms/direct/${userItem.id}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    if (!res.ok) return;

    const room = await res.json();

    window.location.href = `/channel/${room.id}`;

    setSearch("");
    setResults([]);
  }

  async function handleDeleteAccount() {
    const confirmed = window.confirm(
      "Are you sure? This will permanently delete your account and all rooms you own."
    );

    if (!confirmed) return;

    const token = localStorage.getItem("token");

    try {
      const res = await fetch(`${API_BASE}/api/users/delete`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!res.ok) {
        alert("Failed to delete account.");
        return;
      }

      localStorage.clear();
      onLogout();
    } catch (err) {
      console.error("Delete account failed", err);
      alert("Delete account failed.");
    }
  }

  return (
    <div className="w-64 bg-white border-r border-slate-200 p-4 flex flex-col">

      <RoomControls onCreateChannel={onCreateChannel} />

      <div className="text-xs text-slate-500 mb-4 px-2 py-1 bg-slate-100 rounded-md">
        Logged in as: {user.username}
      </div>

      <input
        value={search}
        onChange={(e) => {
          const v = e.target.value;
          setSearch(v);
          searchUsers(v);
        }}
        placeholder="Search users..."
        className="text-sm border rounded px-2 py-1 mb-2"
      />

      {results.map(u => (
        <div
          key={u.id}
          onClick={() => startDirectChat(u)}
          className="text-sm p-1 cursor-pointer hover:bg-slate-100 rounded"
        >
          {u.username}
        </div>
      ))}

      <div className="text-xs font-semibold text-slate-500 mt-2">Public Channels</div>
      {publicChannels.map(c => (
        <ChannelItem
          key={c.id}
          channel={c}
          unreadCount={unreadCounts?.[c.id] || 0}
        />
      ))}

      <div className="text-xs font-semibold text-slate-500 mt-4">Contacts</div>
      {contacts.map(c => (
        <ChannelItem
          key={c.id}
          channel={c}
          unreadCount={unreadCounts?.[c.id] || 0}
        />
      ))}

      <div className="text-xs font-semibold text-slate-500 mt-4">Private Groups</div>
      {privateGroups.map(c => (
        <ChannelItem
          key={c.id}
          channel={c}
          unreadCount={unreadCounts?.[c.id] || 0}
        />
      ))}

      <button
        onClick={onLogout}
        className="text-sm text-red-500 mt-auto"
      >
        Logout
      </button>

      <button
        onClick={handleDeleteAccount}
        className="text-sm mt-3 border border-red-500 text-red-500 rounded px-2 py-1 hover:bg-red-500 hover:text-white"
      >
        Delete Account
      </button>

    </div>
  );
}
