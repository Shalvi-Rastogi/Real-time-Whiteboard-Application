import React, { useState, useEffect, useRef } from "react";
import Whiteboard from "./Whiteboard";
import { db } from "./firebase";
import "./App.css";
import { ref, set, get, child, remove, onValue, update } from "firebase/database";

export default function App() {
  const [roomId, setRoomId] = useState("");
  const [name, setName] = useState("");
  const [inRoom, setInRoom] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [color, setColor] = useState("#000000");
  const [brushSize, setBrushSize] = useState(3);
  const [newParticipant, setNewParticipant] = useState("");
  const [sharedText, setSharedText] = useState(""); 
  const editorRef = useRef(null);

  // Listen to participants
  useEffect(() => {
    if (!roomId) return;
    const participantsRef = ref(db, `rooms/${roomId}/participants`);
    const unsubscribe = onValue(participantsRef, (snapshot) => {
      const data = snapshot.val() || {};
      setParticipants(Object.values(data));
    });
    return () => unsubscribe();
  }, [roomId]);

  // Listen to shared text updates
  useEffect(() => {
    if (!roomId) return;
    const textRef = ref(db, `rooms/${roomId}/sharedText`);
    const unsubscribe = onValue(textRef, (snapshot) => {
      const data = snapshot.val();
      if (data !== null && data !== sharedText) {
        setSharedText(data);
        if (editorRef.current) editorRef.current.innerHTML = data;
      }
    });
    return () => unsubscribe();
  }, [roomId]);

  // Create Room
  const createRoom = async () => {
    if (!roomId || !name) return alert("Enter room ID and name first!");
    const dbRef = ref(db);
    const snapshot = await get(child(dbRef, `rooms/${roomId}`));
    if (snapshot.exists()) return joinRoom();
    await set(ref(db, `rooms/${roomId}`), { lines: {}, participants: {}, sharedText: "" });
    await addParticipant({ name });
    setInRoom(true);
  };

  // Join Room
  const joinRoom = async () => {
    if (!roomId || !name) return alert("Enter room ID and name first!");
    const dbRef = ref(db);
    const snapshot = await get(child(dbRef, `rooms/${roomId}`));
    if (!snapshot.exists()) return alert("Room does not exist! Create it first.");
    await addParticipant({ name });
    setInRoom(true);
  };

  // Add Participant
  const addParticipant = async (participant) => {
    await set(ref(db, `rooms/${roomId}/participants/${participant.name}`), participant);
  };

  // Leave Room
  const leaveRoom = async () => {
    await remove(ref(db, `rooms/${roomId}/participants/${name}`));
    setInRoom(false);
    setRoomId("");
    setParticipants([]);
  };

  // Add participant manually
  const handleAddParticipant = () => {
    if (!newParticipant.trim()) return;
    addParticipant({ name: newParticipant });
    setNewParticipant("");
  };

  // Shared text change
  const handleTextChange = () => {
    const html = editorRef.current.innerHTML;
    setSharedText(html);
    update(ref(db, `rooms/${roomId}`), { sharedText: html });
  };

  const highlightText = () => {
    document.execCommand("backColor", false, "yellow");
    handleTextChange();
  };

  const changeFontSize = (size) => {
    document.execCommand("fontSize", false, size);
    handleTextChange();
  };

  const handleSave = () => alert("Whiteboard and shared notes auto-saved to Firebase!");

  return (
    <div className="container">
      {inRoom && (
        <div className="sidebar">
          <h3>Room ID: {roomId}</h3>
          <h4>Participants ({participants.length})</h4>
          <ul className="participants">
            {participants.map((p, i) => (<li key={i}>{p.name}</li>))}
          </ul>

          <input
            type="text"
            placeholder="Enter participant name"
            value={newParticipant}
            onChange={(e) => setNewParticipant(e.target.value)}
            className="input-field"
          />
          <button onClick={handleAddParticipant} className="button">Add</button>

          <h4>Shared Notes</h4>
          <div className="toolbar">
            <button onClick={highlightText}>🟨 Highlight</button>
            <button onClick={() => changeFontSize(5)}>A+</button>
            <button onClick={() => changeFontSize(2)}>A−</button>
          </div>

          <div
            ref={editorRef}
            contentEditable
            onInput={handleTextChange}
            dangerouslySetInnerHTML={{ __html: sharedText }}
            className="editor"
          ></div>
        </div>
      )}

      <div className="main">
        {!inRoom ? (
          <div className="form-container">
            {/* Page Title */}
            <h1 className="page-title">Whiteboard</h1>

            <input
              type="text"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field"
            />
            <input
              type="text"
              placeholder="Enter Room ID"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="input-field"
            />
            <div>
              <button onClick={createRoom} className="button">Create Room</button>
              <button onClick={joinRoom} className="button">Join Room</button>
            </div>
          </div>
        ) : (
          <>
            <div className="navbar">
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
              <input type="range" min="1" max="10" value={brushSize} onChange={(e) => setBrushSize(parseInt(e.target.value))} />
              <button onClick={handleSave} className="button">Save</button>
              <button onClick={leaveRoom} className="button">Leave Room</button>
            </div>

            <Whiteboard roomId={roomId} color={color} brushSize={brushSize} />
          </>
        )}
      </div>
    </div>
  );
}
