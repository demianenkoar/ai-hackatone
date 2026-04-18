export default function CreateRoomModal({
  newRoomName,
  setNewRoomName,
  isPublic,
  setIsPublic,
  createRoom,
  close
}) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 font-[Segoe_UI]">

      <div className="bg-white w-96 rounded shadow-lg overflow-hidden">

        <div
          className="px-5 py-3 border-b font-semibold"
          style={{ backgroundColor: "#f5f5f5" }}
        >
          Create Channel
        </div>

        <div className="p-5">

          <input
            value={newRoomName}
            onChange={e => setNewRoomName(e.target.value)}
            placeholder="Channel name"
            className="w-full border rounded px-3 py-2 mb-4"
          />

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={!isPublic}
              onChange={() => setIsPublic(!isPublic)}
            />
            Make this channel private
          </label>

          <div className="flex justify-end gap-2 mt-6">
            <button
              onClick={close}
              className="px-3 py-1 text-sm"
            >
              Cancel
            </button>

            <button
              onClick={createRoom}
              className="text-white px-4 py-1 rounded text-sm"
              style={{ backgroundColor: "#6264a7" }}
            >
              Create
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
