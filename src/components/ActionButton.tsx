import COLORS from "../utils/Colors";

type Variant = "default" | "danger" | "archive" | "primary";

interface ActionButtonProps {
  label: string;
  variant?: Variant;
  onClick?: () => void;
  icon?: string;
  disabled?: boolean;
}

const STYLES: Record<Variant, { bg: string; color: string; border: string }> = {
  default: {
    bg: "#fff",
    color: COLORS.neutro700,
    border: COLORS.neutro100,
  },
  primary: {
    bg: COLORS.violeta400,
    color: "#fff",
    border: COLORS.violeta400,
  },
  archive: {
    bg: COLORS.azul50,
    color: COLORS.azul600,
    border: COLORS.azul100,
  },
  danger: {
    bg: COLORS.rojo50,
    color: COLORS.rojo600,
    border: "#FFC9C9",
  },
};

export default function ActionButton({
  label,
  variant = "default",
  onClick,
  icon,
  disabled = false,
}: ActionButtonProps) {
  const s = STYLES[variant];
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "5px 12px",
        borderRadius: 6,
        fontSize: 12,
        fontWeight: 500,
        cursor: disabled ? "not-allowed" : "pointer",
        background: s.bg,
        color: s.color,
        border: `1px solid ${s.border}`,
        opacity: disabled ? 0.5 : 1,
        transition: "opacity 0.15s",
      }}
    >
      {icon && <i className={`ti ${icon}`} style={{ fontSize: 14 }} aria-hidden="true" />}
      {label}
    </button>
  );
}