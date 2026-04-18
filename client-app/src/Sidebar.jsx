import ChannelItem from "./ChannelItem";
import RoomControls from "./RoomControls";

export default function Sidebar({
  channels,
  currentRoomId,
  setCurrentRoomId,
  user,
  onLogout,
  onCreateChannel
}) {
  const publicChannels = channels.filter(c => !(c.isPrivate ?? !c.isPublic));
  const privateChannels = channels.filter(c => (c.isPrivate ?? !c.isPublic));

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
          active={c.id === currentRoomId}
          onClick={() => setCurrentRoomId(c.id)}
        />
      ))}

      <div className="text-xs font-semibold text-slate-500 mt-4">Private Groups</div>
      {privateChannels.map(c => (
        <ChannelItem
          key={c.id}
          channel={c}
          active={c.id === currentRoomId}
          onClick={() => setCurrentRoomId(c.id)}
        />
      ))}

      <button onClick={onLogout} className="text-sm text-red-500 mt-auto">
        Logout
      </button>

    </div>
  );
}
