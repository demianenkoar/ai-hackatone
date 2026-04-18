export default function RoomControls({ onCreateChannel }) {
  return (
    <div className="flex justify-between items-center mb-2">
      <div className="font-semibold">Channels</div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          console.log("Create button clicked");
          onCreateChannel();
        }}
        className="text-xs text-white px-2 py-1 rounded relative z-10"
        style={{ backgroundColor: "#6264a7" }}
      >
        +
      </button>
    </div>
  );
}
