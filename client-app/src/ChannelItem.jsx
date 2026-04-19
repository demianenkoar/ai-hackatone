import { NavLink } from "react-router-dom";

export default function ChannelItem({ channel, unreadCount, preview, isOnline }) {
  return (
    <NavLink
      to={`/channel/${channel.id}`}
      className={({ isActive }) =>
        `flex items-start gap-2 p-2 rounded-lg cursor-pointer transition-all duration-150
        ${isActive
          ? "bg-indigo-50 text-indigo-700 font-medium"
          : "hover:bg-slate-100 text-slate-700"
        }`
      }
    >
      <div className="relative">
        <div className="avatar">
          {channel.name?.charAt(0).toUpperCase()}
        </div>

        {isOnline && (
          <div className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 rounded-full border border-white"></div>
        )}
      </div>

      <div className="flex flex-col flex-1 min-w-0">
        <div className="flex justify-between text-sm">
          <span className="truncate">{channel.name}</span>

          {unreadCount > 0 && (
            <span className="bg-indigo-500 text-white text-xs px-2 py-0.5 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>

        {preview && (
          <div className="text-xs text-gray-500 truncate">
            {preview}
          </div>
        )}
      </div>
    </NavLink>
  );
}
