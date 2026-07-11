import { useEffect, type ReactNode } from "react";
import COLORS from "../utils/Colors";

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

export default function Drawer({ open, onClose, title, children }: DrawerProps) {
  useEffect(() => {
    if (!open) return;

    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.38)",
        zIndex: 120,
        display: "flex",
        justifyContent: "flex-end",
      }}
    >
      <div
        onClick={event => event.stopPropagation()}
        style={{
          width: 560,
          maxWidth: "92vw",
          height: "100%",
          background: "#fff",
          boxShadow: "-16px 0 40px rgba(15, 23, 42, 0.16)",
          padding: "28px 30px",
          overflowY: "auto",
          boxSizing: "border-box",
        }}
      >
        {title && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
            <div>
              <p style={{ margin: "0 0 4px", fontSize: 12, color: COLORS.neutro500, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Encuesta base
              </p>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: COLORS.neutro900 }}>
                {title}
              </h2>
            </div>
            <button
              onClick={onClose}
              aria-label="Cerrar"
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: COLORS.neutro500,
                fontSize: 20,
                padding: 0,
                display: "flex",
                lineHeight: 1,
              }}
            >
              <i className="ti ti-x" />
            </button>
          </div>
        )}

        {children}
      </div>
    </div>
  );
}
