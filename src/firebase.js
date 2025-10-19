
import { initializeApp } from "firebase/app";

import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyAhFwz5VUliG1yp7z7uk1fiFzk8pb2GlXU",
  authDomain: "whiteboard-fd0e8.firebaseapp.com",
  databaseURL: "https://whiteboard-fd0e8-default-rtdb.firebaseio.com",
  projectId: "whiteboard-fd0e8",
  storageBucket: "whiteboard-fd0e8.firebasestorage.app",
  messagingSenderId: "994903626191",
  appId: "1:994903626191:web:b076c2dbc5989e3954c2ba",
  measurementId: "G-FZLEV4PVHP"
};
export const addParticipant = (roomId, participant) => {
  const roomRef = firebase.database().ref(`rooms/${roomId}/participants`);
  roomRef.push(participant);
};


export const getRoom = (roomId) => {
  return firebase.database().ref(`rooms/${roomId}`);
};

const app = initializeApp(firebaseConfig);

export const db = getDatabase(app);  
