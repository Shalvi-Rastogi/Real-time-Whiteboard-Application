import React, { useEffect } from "react";

const colors = [
  "black", "red", "green", "blue", "orange",
  "purple", "pink", "brown", "cyan", "magenta"
];

const brushSizes = [2, 4, 6, 8, 10];

export default function Navbar({
  username,
  setUsername,
  isLocked,
  setIsLocked,
  brushSize,
  setBrushSize,
  color,
  setColor,
  onImageUpload,
  selectedTool,
  setSelectedTool, // 👈 new prop for handling tools
}) {

  // Fun scroll color feature
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const maxScroll = document.body.scrollHeight - window.innerHeight;
      const index = Math.floor((scrollTop / maxScroll) * colors.length);
      setColor(colors[Math.min(index, colors.length - 1)]);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [setColor]);

  return (
    <nav
      style={{
        padding: "12px 20px",
        backgroundColor: "#1976d2",
        color: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
      }}
    >
      <div>
        <strong style={{ fontSize: "18px" }}>🖊️ Real-Time Whiteboard</strong>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
        {/* Username */}
        <input
          type="text"
          placeholder="Enter your name"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={{
            padding: "6px 10px",
            borderRadius: "4px",
            border: "none",
            fontSize: "14px",
          }}
          disabled={isLocked}
        />
        <button
          onClick={() => setIsLocked(true)}
          style={{
            padding: "6px 12px",
            borderRadius: "4px",
            border: "none",
            backgroundColor: isLocked ? "#888" : "#ff9800",
            color: "white",
            cursor: isLocked ? "not-allowed" : "pointer",
            fontSize: "14px",
          }}
          disabled={isLocked}
        >
          {isLocked ? "Locked" : "Lock Name"}
        </button>

        {/* Color palette */}
        <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>
          {colors.map((c) => (
            <div
              key={c}
              onClick={() => setColor(c)}
              style={{
                width: "20px",
                height: "20px",
                backgroundColor: c,
                border: c === color ? "2px solid white" : "1px solid #ccc",
                borderRadius: "4px",
                cursor: "pointer",
              }}
              title={c}
            />
          ))}
        </div>

        {/* Brush size */}
        <select
          value={brushSize}
          onChange={(e) => setBrushSize(parseInt(e.target.value))}
          style={{
            padding: "6px 10px",
            borderRadius: "4px",
            fontSize: "14px",
          }}
        >
          {brushSizes.map((size) => (
            <option key={size} value={size}>
              {size}px
            </option>
          ))}
        </select>

        {/* Tool buttons */}
        <button
          onClick={() => setSelectedTool("pen")}
          style={{
            backgroundColor: selectedTool === "pen" ? "#1565c0" : "#2196f3",
            color: "white",
            padding: "6px 12px",
            borderRadius: "4px",
            border: "none",
            cursor: "pointer",
          }}
        >
          ✏️ Pen
        </button>

        <button
          onClick={() => setSelectedTool("text")}
          style={{
            backgroundColor: selectedTool === "text" ? "#1565c0" : "#2196f3",
            color: "white",
            padding: "6px 12px",
            borderRadius: "4px",
            border: "none",
            cursor: "pointer",
          }}
        >
          🔤 Text
        </button>

        {/* Image Upload */}
        <label
          style={{
            backgroundColor: "#4caf50",
            padding: "6px 12px",
            borderRadius: "4px",
            color: "white",
            cursor: "pointer",
            fontSize: "14px",
          }}
        >
          📷 Upload Image
          <input
            type="file"
            accept="image/*"
            onChange={onImageUpload}
            style={{ display: "none" }}
          />
        </label>
      </div>
    </nav>
  );
}
