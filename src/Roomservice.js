import { db } from "./firebase";
import { ref, set, push, onValue, get, remove } from "firebase/database";

export const createRoom = async (roomId, username) => {
  const roomRef = ref(db, `rooms/${roomId}`);
  await set(roomRef, {
    participants: [username],
    lines: []
  });
};

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
export const getRoom = async (roomId) => {
  const roomRef = ref(db, `rooms/${roomId}`);
  return await get(roomRef);
};
