export default function CreateRoomModal({
  newRoomName,
  setNewRoomName,
  isPublic,
  setIsPublic,
  createRoom,
  close
}) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40">

      <div className="bg-white p-6 rounded w-80">

        <h2 className="text-lg font-semibold mb-4">
          Create Channel
        </h2>

        <input
          value={newRoomName}
          onChange={e => setNewRoomName(e.target.value)}
          className="w-full border px-3 py-2 rounded mb-3"
          placeholder="Channel name"
        />

        <div className="flex gap-2 mb-4">
          <label>
            <input
              type="checkbox"
              checked={isPublic}
              onChange={() => setIsPublic(!isPublic)}
            />
            Public
          </label>
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={close}>Cancel</button>
          <button
            onClick={createRoom}
            className="text-white px-3 py-1 rounded"
            style={{ backgroundColor: "#6264a7" }}
          >
            Create
          </button>
        </div>

      </div>
    </div>
  );
}
