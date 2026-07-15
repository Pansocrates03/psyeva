import COLORS from "../utils/Colors";

const NAV_ITEMS = [
  { label: "Mi Tablero",     icon: "ti-layout-dashboard", path: "/" },
  { label: "Mis análisis",   icon: "ti-clipboard-list",   path: "/analisis" },
  { label: "Colegios",       icon: "ti-school",           path: "/colegios" },
  { label: "Encuestas base", icon: "ti-forms",            path: "/encuestas" },
  { label: "Configuración",  icon: "ti-settings",         path: "/configuracion" },
  { label: "Links externos",  icon: "ti-external-link",     path: "/links" },
];

export default function Sidebar() {
  const current = window.location.pathname;

  const isActive = (path: string) => {
    if (path === "/") return current === "/";
    return current.startsWith(path);
  };

  return (
    <aside style={{
      width: 220,
      minHeight: "100vh",
      background: COLORS.neutro900,
      display: "flex",
      flexDirection: "column",
      flexShrink: 0,
      position: "sticky",
      top: 0,
      height: "100vh",
    }}>
      {/* Logo */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "20px 16px 18px",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
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
          <div style={{ fontSize: 13, fontWeight: 600, color: "#fff", lineHeight: 1.2 }}>
            Dashboard
          </div>
          <div style={{ fontSize: 11, color: COLORS.neutro400, lineHeight: 1.2 }}>
            Administrativo
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ padding: "12px 8px", flex: 1 }}>
        {NAV_ITEMS.map(item => {
          const active = isActive(item.path);
          return (
            <a
              key={item.path}
              href={item.path}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                padding: "9px 12px",
                borderRadius: 8,
                marginBottom: 2,
                cursor: "pointer",
                background: active ? COLORS.violeta400 : "transparent",
                color: active ? "#fff" : COLORS.neutro500,
                fontSize: 13,
                fontWeight: active ? 500 : 400,
                textDecoration: "none",
                transition: "background 0.15s, color 0.15s",
              }}
              onMouseEnter={e => {
                if (!active) {
                  (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.06)";
                  (e.currentTarget as HTMLAnchorElement).style.color = "#fff";
                }
              }}
              onMouseLeave={e => {
                if (!active) {
                  (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
                  (e.currentTarget as HTMLAnchorElement).style.color = COLORS.neutro500;
                }
              }}
            >
              <i className={`ti ${item.icon}`} style={{ fontSize: 16 }} aria-hidden="true" />
              {item.label}
            </a>
          );
        })}
      </nav>
    </aside>
  );
}