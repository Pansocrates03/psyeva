import COLORS from "../utils/Colors";

interface EstadoBadgeProps {
  estado: string;
}

export default function EstadoBadge({ estado }: EstadoBadgeProps) {
  const esActivo = estado === "activo";
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 5,
      padding: "3px 10px",
      borderRadius: 20,
      fontSize: 12,
      fontWeight: 500,
      background: esActivo ? COLORS.verde50 : COLORS.neutro50,
      color: esActivo ? COLORS.verde600 : COLORS.neutro700,
      border: `1px solid ${esActivo ? "#C6EDA0" : COLORS.neutro100}`,
    }}>
      <span style={{
        width: 6,
        height: 6,
        borderRadius: "50%",
        background: esActivo ? COLORS.verde400 : COLORS.neutro400,
        flexShrink: 0,
      }} />
      {estado}
    </span>
  );
}