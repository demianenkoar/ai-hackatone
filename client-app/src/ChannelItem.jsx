import { NavLink } from "react-router-dom";

export default function ChannelItem({ channel }) {
  return (
    <NavLink
      to={`/channel/${channel.id}`}
      className={({ isActive }) =>
        `flex items-center gap-2 p-2 rounded cursor-pointer transition-all
        ${isActive ? "bg-white channel-active" : "hover:bg-gray-200"}`
      }
    >
      <span>{channel.name ?? channel.title}</span>
    </NavLink>
  );
}
