import COLORS from "../utils/Colors";

interface StatCardProps {
  label: string;
  value: number | string;
  accent?: boolean;
  active?: boolean;
  sub?: string;
  onClick?: () => void;
}

export default function StatCard({ label, value, accent = false, active = false, sub, onClick }: StatCardProps) {
  const isActive = active || accent;

  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      style={{
        flex: 1,
        background: isActive ? COLORS.violeta50 : "#fff",
        border: `1px solid ${isActive ? COLORS.violeta100 : COLORS.neutro100}`,
        borderRadius: 12,
        padding: "14px 20px",
        cursor: onClick ? "pointer" : "default",
        boxShadow: isActive ? `0 0 0 1px ${COLORS.violeta100}` : "none",
      }}
    >
      <div style={{
        fontSize: 11,
        color: isActive ? COLORS.violeta600 : COLORS.neutro500,
        marginBottom: 4,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        fontWeight: 500,
      }}>
        {label}
      </div>
      <div style={{
        fontSize: 28,
        fontWeight: 500,
        color: isActive ? COLORS.violeta400 : COLORS.neutro900,
        lineHeight: 1.1,
      }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 12, color: COLORS.neutro500, marginTop: 4 }}>
          {sub}
        </div>
      )}
    </div>
  );
}