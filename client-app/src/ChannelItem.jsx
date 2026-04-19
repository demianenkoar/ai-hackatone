import { NavLink } from "react-router-dom";

export default function ChannelItem({ channel, unreadCount }) {
  return (
    <NavLink
      to={`/channel/${channel.id}`}
      className={({ isActive }) =>
        `flex items-center gap-2 p-2 rounded cursor-pointer transition-all
        ${isActive ? "bg-white channel-active" : "hover:bg-gray-200"}`
      }
    >
      <span className="flex items-center gap-2 w-full justify-between">
        <span>{channel.name ?? channel.title}</span>

        {unreadCount > 0 && (
          <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
            {unreadCount}
          </span>
        )}
      </span>
    </NavLink>
  );
}
