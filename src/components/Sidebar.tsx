import COLORS from "../utils/Colors";

const NAV_ITEMS = [
  { label: "Mi Tablero",      icon: "ti-layout-dashboard", key: "tablero" },
  { label: "Mis análisis",    icon: "ti-clipboard-list",   key: "analisis", active: true },
  { label: "Escuelas",        icon: "ti-school",           key: "escuelas" },
  { label: "Encuestas base",  icon: "ti-forms",            key: "encuestas" },
  { label: "Configuración",   icon: "ti-settings",         key: "config" },
];

export default function Sidebar() {
  return (
    <aside style={{
      width: 220,
      minHeight: "100vh",
      background: COLORS.neutro900,
      display: "flex",
      flexDirection: "column",
      padding: "0",
      flexShrink: 0,
    }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "20px 20px 18px",
        borderBottom: `1px solid rgba(255,255,255,0.08)`,
      }}>
        <div style={{
          width: 34,
          height: 34,
          borderRadius: 8,
          background: COLORS.violeta400,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}>
          <div style={{
            width: 16,
            height: 16,
            borderRadius: 4,
            background: COLORS.verde400,
          }} />
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: "#fff", lineHeight: 1.2 }}>Dashboard</div>
          <div style={{ fontSize: 11, color: COLORS.neutro400, lineHeight: 1.2 }}>Administrativo</div>
        </div>
      </div>

      <nav style={{ padding: "12px 10px", flex: 1 }}>
        {NAV_ITEMS.map(item => (
          <div key={item.key} style={{
            display: "flex",
            alignItems: "center",
            gap: 9,
            padding: "9px 12px",
            borderRadius: 8,
            marginBottom: 2,
            cursor: "pointer",
            background: item.active ? COLORS.violeta400 : "transparent",
            color: item.active ? "#fff" : COLORS.neutro400,
            fontSize: 13,
            fontWeight: item.active ? 500 : 400,
            transition: "background 0.15s",
          }}>
            <i className={`ti ${item.icon}`} style={{ fontSize: 16 }} aria-hidden="true" />
            {item.label}
          </div>
        ))}
      </nav>
    </aside>
  );
}