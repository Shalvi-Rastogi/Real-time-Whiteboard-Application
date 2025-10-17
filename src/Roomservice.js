import { db } from "./firebase";
import { ref, set, push, onValue, get, remove } from "firebase/database";

// ✅ Create a new room
export const createRoom = async (roomId, username) => {
  const roomRef = ref(db, `rooms/${roomId}`);
  await set(roomRef, {
    participants: [username],
    lines: []
  });
};

// ✅ Join an existing room
export const joinRoom = async (roomId, username) => {
  const roomRef = ref(db, `rooms/${roomId}/participants`);
  const snapshot = await get(roomRef);

  let updatedParticipants = [];
  if (snapshot.exists()) {
    updatedParticipants = snapshot.val();
    if (!updatedParticipants.includes(username)) {
      updatedParticipants.push(username);
    }
  } else {
    updatedParticipants = [username];
  }

  await set(roomRef, updatedParticipants);
};

// ✅ Leave room
export const leaveRoom = async (roomId, username) => {
  const roomRef = ref(db, `rooms/${roomId}/participants`);
  const snapshot = await get(roomRef);

  if (snapshot.exists()) {
    const updatedParticipants = snapshot
      .val()
      .filter((u) => u !== username);
    await set(roomRef, updatedParticipants);
  }
};

// ✅ Listen for participants updates
export const listenParticipants = (roomId, setParticipants) => {
  const roomRef = ref(db, `rooms/${roomId}/participants`);
  onValue(roomRef, (snapshot) => {
    if (snapshot.exists()) {
      setParticipants(snapshot.val());
    } else {
      setParticipants([]);
    }
  });
};

// ✅ Get room data
export const getRoom = async (roomId) => {
  const roomRef = ref(db, `rooms/${roomId}`);
  return await get(roomRef);
};
