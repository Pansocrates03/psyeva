import COLORS from "../utils/Colors";

type Estado = "activo" | "archivado" | "completo" | "en_progreso" | "sin_iniciar";

interface EstadoBadgeProps {
  estado: Estado;
}

const CONFIG: Record<Estado, { label: string; bg: string; color: string; border: string; dot: string }> = {
  activo: {
    label: "Activo",
    bg: COLORS.verde50,
    color: COLORS.verde600,
    border: COLORS.verde100,
    dot: COLORS.verde400,
  },
  archivado: {
    label: "Archivado",
    bg: COLORS.neutro50,
    color: COLORS.neutro700,
    border: COLORS.neutro100,
    dot: COLORS.neutro400,
  },
  completo: {
    label: "Completo",
    bg: COLORS.verde50,
    color: COLORS.verde600,
    border: COLORS.verde100,
    dot: COLORS.verde400,
  },
  en_progreso: {
    label: "En progreso",
    bg: COLORS.ambar50,
    color: COLORS.ambar600,
    border: "#FDEFC0",
    dot: COLORS.ambar400,
  },
  sin_iniciar: {
    label: "Sin iniciar",
    bg: COLORS.azul50,
    color: COLORS.azul600,
    border: COLORS.azul100,
    dot: COLORS.azul400,
  },
};

export default function EstadoBadge({ estado }: EstadoBadgeProps) {
  const c = CONFIG[estado];
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 5,
      padding: "3px 10px",
      borderRadius: 20,
      fontSize: 12,
      fontWeight: 500,
      background: c.bg,
      color: c.color,
      border: `1px solid ${c.border}`,
    }}>
      <span style={{
        width: 6,
        height: 6,
        borderRadius: "50%",
        background: c.dot,
        flexShrink: 0,
      }} />
      {c.label}
    </span>
  );
}