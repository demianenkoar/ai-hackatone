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
  const publicChannels = channels.filter(c => !(c.isPrivate ?? !c.isPublic));
  const privateChannels = channels.filter(c => (c.isPrivate ?? !c.isPublic));

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
    <div className="w-64 bg-[#f3f2f1] border-r p-4 flex flex-col">

      <RoomControls onCreateChannel={onCreateChannel} />

      <div className="text-xs text-slate-500 mb-3">
        Logged in as: {user.username}
      </div>

      <div className="text-xs font-semibold text-slate-500 mt-2">Public Channels</div>
      {publicChannels.map(c => (
        <ChannelItem
          key={c.id}
          channel={c}
          unreadCount={unreadCounts?.[c.id] || 0}
        />
      ))}

      <div className="text-xs font-semibold text-slate-500 mt-4">Private Groups</div>
      {privateChannels.map(c => (
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
