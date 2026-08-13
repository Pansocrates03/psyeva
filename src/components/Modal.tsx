import { useEffect } from "react";
import COLORS from "../utils/Colors";

interface ModalProps {
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export default function Modal({ onClose, title, children }: ModalProps) {
  // Cerrar con Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        // Por encima del Drawer (zIndex: 120) — un Modal puede abrirse
        // sobre un Drawer ya abierto (ej. "Importar Excel" dentro del
        // drawer de grupo) y debe quedar visible encima, no detrás.
        zIndex: 130,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: 16,
          padding: "28px 32px",
          width: 420,
          boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
        }}
      >
        {title && (
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 20,
          }}>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 500, color: COLORS.neutro900 }}>
              {title}
            </h2>
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