import { useState } from "react";
import COLORS from "../utils/Colors";

interface ImagenThumbnailProps {
  src: string;
  alt?: string;
  name?: string;
  onClick?: () => void;
  onDelete?: () => void;
  selected?: boolean;
  size?: "sm" | "md";
}

export default function ImagenThumbnail({
  src,
  alt = "",
  name,
  onClick,
  onDelete,
  selected = false,
  size = "md",
}: ImagenThumbnailProps) {
  const [hovered, setHovered] = useState(false);
  const clickable = !!onClick;
  const displayName = name ?? src.split("/").pop() ?? "imagen";
  const sizePx = size === "sm" ? 40 : 120;

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: size === "sm" ? "1 / 1" : "1 / 1",
        borderRadius: 10,
        overflow: "hidden",
        border: `2px solid ${selected ? COLORS.violeta400 : COLORS.neutro100}`,
        background: COLORS.neutro50,
        boxShadow: hovered && clickable ? `0 10px 24px rgba(110, 80, 184, 0.18)` : "none",
        transform: hovered && clickable ? "translateY(-1px)" : "translateY(0)",
        transition: "transform 0.14s ease, box-shadow 0.14s ease, border-color 0.14s ease",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        type="button"
        onClick={onClick}
        disabled={!clickable}
        aria-label={displayName}
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          padding: 0,
          border: "none",
          background: "transparent",
          display: "block",
          cursor: clickable ? "pointer" : "default",
          overflow: "hidden",
        }}
      >
        <img
          src={src}
          alt={alt}
          loading="lazy"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
            transform: hovered && clickable ? "scale(1.04)" : "scale(1)",
            transition: "transform 0.2s ease",
          }}
        />

        {name && (
          <div
            style={{
              position: "absolute",
              inset: "auto 0 0 0",
              padding: "8px 10px 9px",
              background: "linear-gradient(180deg, rgba(16,24,40,0) 0%, rgba(16,24,40,0.82) 100%)",
              color: "#fff",
              fontSize: 11,
              lineHeight: 1.2,
              fontWeight: 600,
              letterSpacing: "0.01em",
              opacity: hovered ? 1 : 0,
              transform: hovered ? "translateY(0)" : "translateY(12px)",
              transition: "opacity 0.15s ease, transform 0.15s ease",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              overflow: "hidden",
            }}
          >
            {displayName}
          </div>
        )}
      </button>

      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          aria-label={`Eliminar ${displayName}`}
          style={{
            position: "absolute",
            top: 6,
            right: 6,
            width: 26,
            height: 26,
            borderRadius: "50%",
            border: "none",
            background: "rgba(0,0,0,0.6)",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            boxShadow: "0 8px 18px rgba(0,0,0,0.18)",
            zIndex: 2,
          }}
        >
          <i className="ti ti-trash" style={{ fontSize: 13 }} aria-hidden="true" />
        </button>
      )}

      {clickable && !name && (
        <div
          style={{
            position: "absolute",
            inset: "auto 0 0 0",
            padding: "8px 10px",
            background: "rgba(16,24,40,0.5)",
            color: "#fff",
            fontSize: 11,
            fontWeight: 700,
            opacity: hovered ? 1 : 0,
            transform: hovered ? "translateY(0)" : "translateY(10px)",
            transition: "opacity 0.15s ease, transform 0.15s ease",
          }}
        >
          Seleccionar
        </div>
      )}
    </div>
  );
}
