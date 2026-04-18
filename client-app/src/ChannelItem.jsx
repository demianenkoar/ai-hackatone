export default function ChannelItem({ channel, active, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-all
      ${active ? "bg-white channel-active" : "hover:bg-gray-200"}`}
    >
      <span>{channel.name ?? channel.title}</span>
    </div>
  );
}
