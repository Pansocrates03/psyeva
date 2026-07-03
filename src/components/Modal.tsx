import COLORS from "../utils/Colors";

interface ModalProps {
  onClose: () => void;
}

export default function Modal({ onClose }: ModalProps) {
  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "rgba(0,0,0,0.35)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 100,
    }}>
      <div style={{
        background: "#fff",
        borderRadius: 16,
        padding: "28px 32px",
        width: 400,
        boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 500, color: COLORS.neutro900 }}>Crear nuevo análisis</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: COLORS.neutro500, fontSize: 20, padding: 0, display: "flex" }}>
            <i className="ti ti-x" aria-label="Cerrar" />
          </button>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: COLORS.neutro700, marginBottom: 6 }}>
            Nombre de la escuela
          </label>
          <input
            type="text"
            placeholder="Ej. Instituto Oviedo"
            style={{
              width: "100%",
              padding: "9px 12px",
              border: `1px solid ${COLORS.neutro100}`,
              borderRadius: 8,
              fontSize: 14,
              color: COLORS.neutro900,
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: COLORS.neutro700, marginBottom: 6 }}>
            Fecha del análisis
          </label>
          <input
            type="date"
            style={{
              width: "100%",
              padding: "9px 12px",
              border: `1px solid ${COLORS.neutro100}`,
              borderRadius: 8,
              fontSize: 14,
              color: COLORS.neutro900,
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{
            padding: "9px 18px", borderRadius: 8, fontSize: 14,
            background: "none", border: `1px solid ${COLORS.neutro100}`,
            color: COLORS.neutro700, cursor: "pointer",
          }}>
            Cancelar
          </button>
          <button style={{
            padding: "9px 20px", borderRadius: 8, fontSize: 14,
            background: COLORS.violeta400, border: "none",
            color: "#fff", fontWeight: 500, cursor: "pointer",
          }}>
            Crear
          </button>
        </div>
      </div>
    </div>
  );
}