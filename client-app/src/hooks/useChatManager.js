import { useEffect, useRef, useState, useCallback } from "react";

const API_BASE = "http://localhost:58097";

export default function useChatManager(connectionRef) {
  const [rooms, setRooms] = useState([]);

  const previousRoomRef = useRef(null);

  const safeFetch = async (url, options = {}) => {
    const token = localStorage.getItem("token");

    const res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
        Authorization: "Bearer " + token
      }
    });

    if (!res.ok) return null;

    return res;
  };

  const loadRooms = useCallback(async () => {
    const res = await safeFetch(`${API_BASE}/api/rooms`);
    if (!res) return;

    const data = await res.json();
    setRooms(data);
  }, []);

  const markRoomRead = useCallback(async (roomId) => {
    if (!roomId) return;

    await safeFetch(`${API_BASE}/api/rooms/${roomId}/read`, {
      method: "POST"
    });

    setRooms(prev =>
      prev.map(r =>
        String(r.id) === String(roomId)
          ? { ...r, unreadCount: 0 }
          : r
      )
    );
  }, []);

  const handleRoomChange = useCallback((roomId) => {
    if (!roomId) return;

    if (previousRoomRef.current === roomId) return;

    previousRoomRef.current = roomId;

    markRoomRead(roomId);
  }, [markRoomRead]);

  useEffect(() => {
    const connection = connectionRef?.current;
    if (!connection) return;

    const unreadHandler = (roomId) => {
      setRooms(prev =>
        prev.map(r =>
          String(r.id) === String(roomId)
            ? { ...r, unreadCount: (r.unreadCount || 0) + 1 }
            : r
        )
      );
    };

    connection.on("UnreadIncrement", unreadHandler);

    return () => {
      connection.off("UnreadIncrement", unreadHandler);
    };
  }, [connectionRef]);

  return {
    rooms,
    setRooms,
    loadRooms,
    handleRoomChange
  };
}
