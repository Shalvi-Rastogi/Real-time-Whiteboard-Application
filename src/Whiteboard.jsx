// src/Whiteboard.jsx
import React, { useEffect, useRef, useState } from "react";
import { db } from "./firebase";
import { ref, set, onValue } from "firebase/database";

export default function Whiteboard({ roomId, color, brushSize }) {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const imageInputRef = useRef(null);

  const [isDrawing, setIsDrawing] = useState(false);
  const [lines, setLines] = useState([]);
  const [currentTool, setCurrentTool] = useState("pen");
  const [startPos, setStartPos] = useState(null);
  const [currentPoints, setCurrentPoints] = useState([]);
  const [showTextInput, setShowTextInput] = useState(false);
  const [textPos, setTextPos] = useState({ x: 0, y: 0 });
  const [inputText, setInputText] = useState("");

  // Undo/Redo stacks
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);

  // Draw a single line/tool
  const drawLine = (ctx, line) => {
    if (!ctx) return;
    if (line.tool === "pen" || line.tool === "eraser") {
      ctx.strokeStyle = line.color;
      ctx.lineWidth = line.size;
      ctx.beginPath();
      const points = line.points;
      if (points.length > 0) ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
      ctx.stroke();
    } else if (line.tool === "line") {
      ctx.strokeStyle = line.color;
      ctx.lineWidth = line.size;
      ctx.beginPath();
      ctx.moveTo(line.start.x, line.start.y);
      ctx.lineTo(line.end.x, line.end.y);
      ctx.stroke();
    } else if (line.tool === "rectangle") {
      ctx.strokeStyle = line.color;
      ctx.lineWidth = line.size;
      ctx.strokeRect(
        line.start.x,
        line.start.y,
        line.end.x - line.start.x,
        line.end.y - line.start.y
      );
    } else if (line.tool === "circle") {
      ctx.strokeStyle = line.color;
      ctx.lineWidth = line.size;
      const radius = Math.sqrt(
        Math.pow(line.end.x - line.start.x, 2) + Math.pow(line.end.y - line.start.y, 2)
      );
      ctx.beginPath();
      ctx.arc(line.start.x, line.start.y, radius, 0, 2 * Math.PI);
      ctx.stroke();
    } else if (line.tool === "text") {
      ctx.font = `${line.size * 5}px Arial`;
      ctx.fillStyle = line.color;
      ctx.fillText(line.text, line.start.x, line.start.y);
    } else if (line.tool === "image") {
      const img = new Image();
      img.src = line.src;
      img.onload = () => ctx.drawImage(img, line.x, line.y, line.width, line.height);
    }
  };

  // Load lines/images from Firebase
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctxRef.current = ctx;

    const unsubscribe = onValue(ref(db, `rooms/${roomId}/lines`), (snapshot) => {
      const data = snapshot.val() || {};
      setLines(Object.values(data));
    });

    return () => unsubscribe();
  }, [roomId]);

  // Redraw canvas whenever lines update
  useEffect(() => {
    const ctx = ctxRef.current;
    const canvas = canvasRef.current;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    lines.forEach((line) => drawLine(ctx, line));
  }, [lines]);

  const getCursorPosition = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const startDrawing = (e) => {
    const { x, y } = getCursorPosition(e);

    if (currentTool === "text") {
      setTextPos({ x, y });
      setShowTextInput(true);
      return;
    }

    if (currentTool === "image") {
      imageInputRef.current.click();
      return;
    }

    setIsDrawing(true);
    setStartPos({ x, y });
    if (currentTool === "pen" || currentTool === "eraser") {
      setCurrentPoints([{ x, y }]);
    }
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const { x, y } = getCursorPosition(e);
    const ctx = ctxRef.current;

    if (currentTool === "pen" || currentTool === "eraser") {
      const newPoints = [...currentPoints, { x, y }];
      setCurrentPoints(newPoints);

      const tempLine = {
        tool: currentTool,
        color: currentTool === "eraser" ? "#ffffff" : color,
        size: currentTool === "eraser" ? brushSize * 4 : brushSize,
        points: newPoints,
      };
      drawLine(ctx, tempLine);
    } else {
      const canvas = canvasRef.current;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      lines.forEach((line) => drawLine(ctx, line));
      const tempLine = { tool: currentTool, color, size: brushSize, start: startPos, end: { x, y } };
      drawLine(ctx, tempLine);
    }
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    if (currentTool === "pen" || currentTool === "eraser") {
      const newLine = {
        tool: currentTool,
        color: currentTool === "eraser" ? "#ffffff" : color,
        size: currentTool === "eraser" ? brushSize * 4 : brushSize,
        points: currentPoints,
      };
      saveLine(newLine);
      setCurrentPoints([]);
    } else if (currentTool !== "text" && currentTool !== "image") {
      const newLine = { tool: currentTool, color, size: brushSize, start: startPos, end: startPos };
      saveLine(newLine);
    }

    setStartPos(null);
  };

  // Save line to Firebase & push to undo stack
  const saveLine = (newLine) => {
    const key = Date.now();
    const linesRef = ref(db, `rooms/${roomId}/lines/${key}`);
    set(linesRef, newLine);
    setUndoStack((prev) => [...prev, { key, line: newLine }]);
    setRedoStack([]); // Clear redo stack on new action
  };

  // Clear board
  const clearBoard = () => {
    set(ref(db, `rooms/${roomId}/lines`), {});
    setUndoStack([]);
    setRedoStack([]);
  };

  // Handle Image Upload
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const imgObj = {
        tool: "image",
        src: event.target.result,
        x: 50,
        y: 50,
        width: 200,
        height: 200,
      };
      saveLine(imgObj);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // Undo action
  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const lastAction = undoStack[undoStack.length - 1];
    setUndoStack(undoStack.slice(0, -1));
    setRedoStack((prev) => [...prev, lastAction]);
    set(ref(db, `rooms/${roomId}/lines/${lastAction.key}`), null);
  };

  // Redo action
  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const lastUndone = redoStack[redoStack.length - 1];
    setRedoStack(redoStack.slice(0, -1));
    setUndoStack((prev) => [...prev, lastUndone]);
    const linesRef = ref(db, `rooms/${roomId}/lines/${lastUndone.key}`);
    set(linesRef, lastUndone.line);
  };

  return (
    <div style={styles.wrapper}>
      {/* Toolbar */}
      <div style={styles.toolbar}>
        <h3 style={styles.title}>🎨 Tools</h3>
        <div style={styles.toolsContainer}>
          <button onClick={handleUndo} style={styles.toolButton}>↩️ Undo</button>
          <button onClick={handleRedo} style={styles.toolButton}>↪️ Redo</button>
          {["pen", "eraser", "line", "rectangle", "circle", "text"].map((tool) => (
            <button
              key={tool}
              onClick={() => setCurrentTool(tool)}
              style={{
                ...styles.toolButton,
                backgroundColor: currentTool === tool ? "#007bff" : "#f9f9f9",
                color: currentTool === tool ? "#fff" : "#333",
              }}
            >
              {tool}
            </button>
          ))}
          <button
            onClick={() => imageInputRef.current && imageInputRef.current.click()}
            style={{
              ...styles.toolButton,
              backgroundColor: currentTool === "image" ? "#007bff" : "#f9f9f9",
              color: currentTool === "image" ? "#fff" : "#333",
            }}
          >
            🖼️ Image
          </button>
          <button onClick={clearBoard} style={styles.clearButton}>
            🧹 Clear
          </button>
        </div>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={900}
        height={520}
        style={styles.canvas}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
      />

      {/* Text input popup */}
      {showTextInput && (
        <div
          style={{
            position: "absolute",
            left: textPos.x + 20,
            top: textPos.y + 120,
            background: "white",
            padding: "6px",
            border: "1px solid #ccc",
            borderRadius: "6px",
            zIndex: 10,
          }}
        >
          <input
            type="text"
            autoFocus
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && inputText.trim() !== "") {
                const newLine = {
                  tool: "text",
                  color,
                  size: brushSize,
                  start: textPos,
                  text: inputText.trim(),
                };
                saveLine(newLine);
                setShowTextInput(false);
                setInputText("");
              }
            }}
            placeholder="Type and press Enter"
            style={{ border: "none", outline: "none" }}
          />
        </div>
      )}

      {/* Hidden image input */}
      <input
        type="file"
        ref={imageInputRef}
        accept="image/*"
        onChange={handleImageUpload}
        style={{ display: "none" }}
      />
    </div>
  );
}

// Styles
const styles = {
  wrapper: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    background: "#f8f9fa",
    height: "100%",
    paddingTop: "15px",
    position: "relative",
  },
  toolbar: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    background: "#ffffff",
    borderRadius: "12px",
    padding: "10px 20px",
    boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
    marginBottom: "15px",
  },
  title: {
    margin: "5px 0 10px 0",
    fontWeight: "600",
    color: "#333",
  },
  toolsContainer: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  toolButton: {
    padding: "8px 14px",
    border: "1px solid #ccc",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "14px",
    transition: "all 0.2s",
  },
  clearButton: {
    padding: "8px 14px",
    backgroundColor: "#dc3545",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
  },
  canvas: {
    border: "3px solid #333",
    borderRadius: "10px",
    background: "#fff",
    boxShadow: "0 3px 8px rgba(0,0,0,0.1)",
    cursor: "crosshair",
  },
};
