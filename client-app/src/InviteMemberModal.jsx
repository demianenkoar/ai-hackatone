import { useState } from "react";

export default function InviteMemberModal({ inviteUser, close }) {

  const [userId, setUserId] = useState("");

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40">

      <div className="bg-white p-6 rounded w-80">

        <h2 className="text-lg font-semibold mb-4">
          Invite Member
        </h2>

        <input
          value={userId}
          onChange={e => setUserId(e.target.value)}
          placeholder="User ID"
          className="w-full border px-3 py-2 rounded mb-3"
        />

        <div className="flex justify-end gap-2">
          <button onClick={close}>Cancel</button>

          <button
            onClick={() => inviteUser(userId)}
            className="text-white px-3 py-1 rounded"
            style={{ backgroundColor: "#6264a7" }}
          >
            Invite
          </button>
        </div>

      </div>
    </div>
  );
}
