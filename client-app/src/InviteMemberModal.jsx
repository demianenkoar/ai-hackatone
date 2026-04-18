import { useState } from "react";

export default function InviteMemberModal({ roomId, inviteUser, close }) {

  const [identifier, setIdentifier] = useState("");

  function handleInvite() {
    if (!identifier.trim()) return;
    inviteUser(roomId, identifier);
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">

      <div className="bg-white w-80 rounded shadow-lg">

        <div
          className="px-4 py-2 border-b font-semibold"
          style={{ backgroundColor: "#f5f5f5" }}
        >
          Invite Member
        </div>

        <div className="p-4">

          <input
            value={identifier}
            onChange={e => setIdentifier(e.target.value)}
            placeholder="Username or email"
            className="w-full border rounded px-3 py-2 mb-4"
          />

          <div className="flex justify-end gap-2">
            <button onClick={close}>
              Cancel
            </button>

            <button
              onClick={handleInvite}
              className="text-white px-3 py-1 rounded"
              style={{ backgroundColor: "#6264a7" }}
            >
              Add
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
