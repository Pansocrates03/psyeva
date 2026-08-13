import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import COLORS from "../utils/Colors";
import { iniciarSesionAdmin, haySesionAdmin } from "../utils/adminAuth";

export default function Login() {
  const [usuario, setUsuario] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [error, setError] = useState("");
  const [focused, setFocused] = useState<"usuario" | "contrasena" | null>(null);
  const navigate = useNavigate();

  // Si ya hay sesión de admin, no tiene caso mostrar el login otra vez.
  useEffect(() => {
    if (haySesionAdmin()) navigate("/admin/evaluaciones", { replace: true });
  }, [navigate]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!usuario.trim() || !contrasena.trim()) {
      setError("Ingresa usuario y contraseña");
      return;
    }

    if (!iniciarSesionAdmin(usuario, contrasena)) {
      setError("Usuario o contraseña incorrectos");
      return;
    }

    navigate("/admin/evaluaciones");
  };

  const inputStyle = (campo: "usuario" | "contrasena"): React.CSSProperties => ({
    width: "100%",
    padding: "10px 12px",
    border: `1.5px solid ${focused === campo ? COLORS.violeta400 : COLORS.neutro100}`,
    borderRadius: 8,
    fontSize: 14,
    color: COLORS.neutro900,
    outline: "none",
    boxSizing: "border-box",
    boxShadow: focused === campo ? `0 0 0 3px ${COLORS.violeta50}` : "none",
    transition: "border-color 0.15s, box-shadow 0.15s",
  });

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      minHeight: "100vh", padding: 24,
      background: `linear-gradient(135deg, ${COLORS.violeta50} 0%, ${COLORS.neutro50} 60%, ${COLORS.azul50} 100%)`,
      fontFamily: "system-ui, -apple-system, sans-serif",
    }}>
      <div style={{
        width: 380, background: "#fff", borderRadius: 16,
        boxShadow: "0 4px 24px rgba(0,0,0,0.10)", overflow: "hidden",
      }}>
        <div style={{ padding: "24px 28px 16px", borderBottom: `1px solid ${COLORS.neutro100}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 8, background: COLORS.violeta400,
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <div style={{ width: 16, height: 16, borderRadius: 4, background: COLORS.verde400 }} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: COLORS.neutro900 }}>PSYEVA</div>
              <div style={{ fontSize: 11, color: COLORS.neutro500 }}>Dashboard administrativo</div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: "24px 28px 28px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: COLORS.neutro500, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
              Usuario
            </label>
            <input
              type="text"
              value={usuario}
              onChange={e => { setUsuario(e.target.value); setError(""); }}
              onFocus={() => setFocused("usuario")}
              onBlur={() => setFocused(null)}
              autoFocus
              style={inputStyle("usuario")}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: COLORS.neutro500, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
              Contraseña
            </label>
            <input
              type="password"
              value={contrasena}
              onChange={e => { setContrasena(e.target.value); setError(""); }}
              onFocus={() => setFocused("contrasena")}
              onBlur={() => setFocused(null)}
              style={inputStyle("contrasena")}
            />
          </div>

          {error && <p style={{ margin: 0, fontSize: 12, color: COLORS.rojo400 }}>{error}</p>}

          <button type="submit" style={{
            width: "100%", padding: "11px 20px", borderRadius: 8, border: "none",
            background: COLORS.violeta400, color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer",
          }}>
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
}
