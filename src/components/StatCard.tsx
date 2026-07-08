import COLORS from "../utils/Colors";

interface StatCardProps {
  label: string;
  value: number | string;
  accent?: boolean;
  sub?: string;
}

export default function StatCard({ label, value, accent = false, sub }: StatCardProps) {
  return (
    <div style={{
      flex: 1,
      background: accent ? COLORS.violeta50 : "#fff",
      border: `1px solid ${accent ? COLORS.violeta100 : COLORS.neutro100}`,
      borderRadius: 12,
      padding: "14px 20px",
    }}>
      <div style={{
        fontSize: 11,
        color: accent ? COLORS.violeta600 : COLORS.neutro500,
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
        color: accent ? COLORS.violeta400 : COLORS.neutro900,
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