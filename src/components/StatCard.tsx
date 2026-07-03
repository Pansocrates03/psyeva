import COLORS from "../utils/Colors";

interface StatCardProps {
  label: string;
  value: number | string;
  accent?: boolean;
}

export default function StatCard({ label, value, accent }: StatCardProps) {
  return (
    <div style={{
      flex: 1,
      background: accent ? COLORS.violeta50 : "#fff",
      border: `1px solid ${accent ? COLORS.violeta100 : COLORS.neutro100}`,
      borderRadius: 12,
      padding: "14px 20px",
    }}>
      <div style={{ fontSize: 12, color: accent ? COLORS.violeta600 : COLORS.neutro500, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 500, color: accent ? COLORS.violeta400 : COLORS.neutro900, lineHeight: 1.1 }}>
        {value}
      </div>
    </div>
  );
}