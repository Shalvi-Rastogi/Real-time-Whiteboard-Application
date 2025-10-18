import React, { useEffect, useRef, useState } from "react";
import { db } from "./firebase";
import { ref, set, onValue } from "firebase/database";
import Draggable from "react-draggable";
import { ResizableBox } from "react-resizable";
import "react-resizable/css/styles.css";

export default function Whiteboard({ roomId, color = "#000", brushSize = 4 }) {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const imageInputRef = useRef(null);

  const [isDrawing, setIsDrawing] = useState(false);
  const [lines, setLines] = useState([]);
  const [currentTool, setCurrentTool] = useState("pen");
  const [startPos, setStartPos] = useState(null);
  const [currentPoints, setCurrentPoints] = useState([]);
  const [tempShape, setTempShape] = useState(null);

  const [canvasImages, setCanvasImages] = useState([]);
  const [showTextInput, setShowTextInput] = useState(false);
  const [textPos, setTextPos] = useState({ x: 0, y: 0 });
  const [inputText, setInputText] = useState("");

  // Load lines and images from Firebase
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctxRef.current = ctx;

    const unsubscribe = onValue(ref(db, `rooms/${roomId}/lines`), (snapshot) => {
      const data = snapshot.val() || {};
      const allLines = Object.values(data);
      const images = allLines.filter((l) => l.tool === "image");
      const otherLines = allLines.filter((l) => l.tool !== "image");
      setLines(otherLines);
      setCanvasImages(images);
    });

    return () => unsubscribe();
  }, [roomId]);

  // Draw everything
  const drawAll = () => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const canvas = canvasRef.current;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    lines.forEach((line) => drawLine(ctx, line));
    if (tempShape) drawLine(ctx, tempShape);
  };

  useEffect(() => drawAll(), [lines, tempShape]);

  const getCursorPosition = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) * canvas.width) / rect.width,
      y: ((e.clientY - rect.top) * canvas.height) / rect.height,
    };
  };

  const drawLine = (ctx, line) => {
    ctx.strokeStyle = line.color;
    ctx.fillStyle = line.color;
    ctx.lineWidth = line.size;

    switch (line.tool) {
      case "pen":
      case "eraser":
        ctx.beginPath();
        if (line.points.length > 0) ctx.moveTo(line.points[0].x, line.points[0].y);
        line.points.forEach((p) => ctx.lineTo(p.x, p.y));
        ctx.stroke();
        break;
      case "line":
        ctx.beginPath();
        ctx.moveTo(line.start.x, line.start.y);
        ctx.lineTo(line.end.x, line.end.y);
        ctx.stroke();
        break;
      case "rectangle":
        ctx.beginPath();
        ctx.strokeRect(
          line.start.x,
          line.start.y,
          line.end.x - line.start.x,
          line.end.y - line.start.y
        );
        break;
      case "circle":
        const radius = Math.sqrt(
          (line.end.x - line.start.x) ** 2 + (line.end.y - line.start.y) ** 2
        );
        ctx.beginPath();
        ctx.arc(line.start.x, line.start.y, radius, 0, 2 * Math.PI);
        ctx.stroke();
        break;
      case "text":
        ctx.font = `${line.size * 5}px Arial`;
        ctx.fillText(line.text, line.start.x, line.start.y);
        break;
      default:
        break;
    }
  };

  const startDrawing = (e) => {
    const pos = getCursorPosition(e);
    if (currentTool === "text") {
      setTextPos(pos);
      setShowTextInput(true);
      return;
    }
    setIsDrawing(true);
    setStartPos(pos);
    if (currentTool === "pen" || currentTool === "eraser") setCurrentPoints([pos]);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const pos = getCursorPosition(e);
    if (currentTool === "pen" || currentTool === "eraser") {
      const newPoints = [...currentPoints, pos];
      setCurrentPoints(newPoints);
      drawAll();
      drawLine(ctxRef.current, {
        tool: currentTool,
        color: currentTool === "eraser" ? "#fff" : color,
        size: currentTool === "eraser" ? brushSize * 4 : brushSize,
        points: newPoints,
      });
    } else if (["line", "rectangle", "circle"].includes(currentTool)) {
      setTempShape({ tool: currentTool, color, size: brushSize, start: startPos, end: pos });
    }
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (currentTool === "pen" || currentTool === "eraser") {
      saveLine({
        tool: currentTool,
        color: currentTool === "eraser" ? "#fff" : color,
        size: currentTool === "eraser" ? brushSize * 4 : brushSize,
        points: currentPoints,
      });
      setCurrentPoints([]);
    } else if (["line", "rectangle", "circle"].includes(currentTool)) {
      saveLine(tempShape);
      setTempShape(null);
    }
    setStartPos(null);
  };

  const saveLine = (line) => {
    if (!line) return;
    set(ref(db, `rooms/${roomId}/lines/${Date.now()}`), line);
  };

  const clearBoard = () => {
    set(ref(db, `rooms/${roomId}/lines`), {});
    setCanvasImages([]);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const imgObj = {
        id: Date.now(),
        src: event.target.result,
        x: 100,
        y: 100,
        width: 200,
        height: 200,
        tool: "image",
      };
      setCanvasImages((prev) => [...prev, imgObj]);
      saveLine(imgObj);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const updateImage = (imgId, newProps) => {
    setCanvasImages((prev) =>
      prev.map((img) => (img.id === imgId ? { ...img, ...newProps } : img))
    );
    // Optional: save to Firebase only after drag/resize is finished
  };

  return (
    <div style={styles.wrapper}>
      {/* Toolbar */}
      <div style={styles.toolbar}>
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
            {tool.toUpperCase()}
          </button>
        ))}
        <button onClick={() => imageInputRef.current.click()} style={styles.toolButton}>
          IMAGE
        </button>
        <button onClick={clearBoard} style={styles.clearButton}>
          CLEAR
        </button>
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

      {/* Text input */}
      {showTextInput && (
        <input
          type="text"
          autoFocus
          value={inputText}
          style={{
            position: "absolute",
            left: textPos.x,
            top: textPos.y,
            fontSize: brushSize * 5,
            border: "1px solid #ccc",
            outline: "none",
          }}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && inputText.trim()) {
              const newLine = { tool: "text", color, size: brushSize, start: textPos, text: inputText.trim() };
              saveLine(newLine);
              setInputText("");
              setShowTextInput(false);
            }
          }}
        />
      )}

      {/* Hidden file input */}
      <input type="file" ref={imageInputRef} style={{ display: "none" }} onChange={handleImageUpload} />

      {/* Images */}
      {canvasImages.map((img) => (
        <Draggable
          key={img.id}
          position={{ x: img.x, y: img.y }}
          onStop={(e, data) => updateImage(img.id, { x: data.x, y: data.y })}
        >
          <ResizableBox
            width={img.width}
            height={img.height}
            resizeHandles={["se"]}
            minConstraints={[50, 50]}
            maxConstraints={[600, 600]}
            onResizeStop={(e, { size }) => updateImage(img.id, { width: size.width, height: size.height })}
          >
            <img src={img.src} alt="canvas-img" style={{ width: "100%", height: "100%", cursor: "move" }} />
          </ResizableBox>
        </Draggable>
      ))}
    </div>
  );
}

const styles = {
  wrapper: { display: "flex", flexDirection: "column", alignItems: "center", position: "relative" },
  toolbar: { display: "flex", gap: "10px", marginBottom: "10px", flexWrap: "wrap" },
  toolButton: { padding: "6px 12px", borderRadius: "6px", border: "1px solid #ccc", cursor: "pointer" },
  clearButton: { padding: "6px 12px", borderRadius: "6px", border: "none", background: "#dc3545", color: "#fff", cursor: "pointer" },
  canvas: { border: "2px solid #333", borderRadius: "8px", background: "#fff" },
};
