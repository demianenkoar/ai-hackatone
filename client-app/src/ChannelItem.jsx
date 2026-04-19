import { NavLink } from "react-router-dom";

export default function ChannelItem({ channel, unreadCount }) {
  return (
    <NavLink
      to={`/channel/${channel.id}`}
      className={({ isActive }) =>
        `flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all duration-150
        ${isActive
          ? "bg-indigo-50 text-indigo-700 font-medium"
          : "hover:bg-slate-100 text-slate-700"
        }`
      }
    >
      <span className="flex items-center gap-2 w-full justify-between">
        <span>{channel.name ?? channel.title}</span>

        {unreadCount > 0 && (
          <span className="bg-indigo-500 text-white text-xs px-2 py-0.5 rounded-full">
            {unreadCount}
          </span>
        )}
      </span>
    </NavLink>
  );
}
