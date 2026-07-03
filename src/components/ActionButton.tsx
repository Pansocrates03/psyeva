import COLORS from "../utils/Colors";

interface ActionButtonProps {
  label: string;
  variant?: "default" | "danger" | "archive";
  onClick: () => void;
}

export default function ActionButton({ label, variant = "default", onClick }: ActionButtonProps) {
  const styles = {
    default: {
      background: "#fff",
      color: COLORS.neutro700,
      border: `1px solid ${COLORS.neutro100}`,
    },
    danger: {
      background: COLORS.rojo50,
      color: COLORS.rojo600,
      border: `1px solid #FFC9C9`,
    },
    archive: {
      background: COLORS.azul50,
      color: COLORS.azul600,
      border: `1px solid #A8DCFF`,
    },
  };
  return (
    <button onClick={onClick} style={{
      padding: "5px 12px",
      borderRadius: 6,
      fontSize: 12,
      fontWeight: 500,
      cursor: "pointer",
      ...styles[variant],
    }}>
      {label}
    </button>
  );
}