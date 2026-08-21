import { useState } from "react";
import COLORS from "@/utils/Colors";

// ── Tipos ─────────────────────────────────────────────────────
interface Opcion {
  label: string;
  value: number;
}

interface ReactivoProps {
  /** Texto de la pregunta */
  pregunta: string;
  /** URL opcional de imagen que acompaña al enunciado de ESTA pregunta puntual */
  imagenUrl?: string;
  /** Instrucción de la sección a la que pertenece la pregunta (texto) */
  instruccionTexto?: string;
  /** Instrucción de la sección a la que pertenece la pregunta (imagen) */
  instruccionImagenUrl?: string;
  /** Opciones de respuesta */
  opciones: Opcion[];
  /** Número de pregunta actual (1-based) */
  numeroPregunta: number;
  /** Total de preguntas del formulario */
  totalPreguntas: number;
  /** Nombre del estudiante para personalizar la pantalla */
  nombreEstudiante?: string;
  /** Valor actualmente seleccionado (controlled) */
  valorSeleccionado?: number | null;
  /** Callback al seleccionar una opción */
  onSeleccionar?: (valor: number) => void;
  /** Callback al presionar "Anterior" */
  onAnterior?: () => void;
  /** Callback al presionar "Siguiente" / "Terminar" */
  onSiguiente?: () => void;
  /** Si es la última pregunta, cambia "Siguiente" por "Terminar" */
  esUltima?: boolean;
}

// ── Componente ────────────────────────────────────────────────
export default function Reactivo({
  pregunta,
  imagenUrl,
  instruccionTexto,
  instruccionImagenUrl,
  opciones,
  numeroPregunta,
  totalPreguntas,
  nombreEstudiante,
  valorSeleccionado = null,
  onSeleccionar,
  onAnterior,
  onSiguiente,
  esUltima = false,
}: ReactivoProps) {
  const [hovered, setHovered] = useState<number | null>(null);

  const progreso = ((numeroPregunta - 1) / totalPreguntas) * 100;
  const puedeAvanzar = valorSeleccionado !== null;
  const esPrimera = numeroPregunta === 1;

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      minHeight: "100vh",
      background: COLORS.neutro50,
      fontFamily: "system-ui, -apple-system, sans-serif",
    }}>

      {/* ── Barra superior ── */}
      <header style={{
        background: "#fff",
        borderBottom: `1px solid ${COLORS.neutro100}`,
        padding: "14px 28px",
        display: "flex",
        alignItems: "center",
        gap: 16,
        flexShrink: 0,
      }}>
        {/* Logo PSYEVA */}
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: COLORS.violeta400,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          <div style={{ width: 14, height: 14, borderRadius: 3, background: COLORS.verde400 }} />
        </div>

        {/* Barra de progreso */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            flex: 1, height: 6, borderRadius: 6,
            background: COLORS.neutro100, overflow: "hidden",
          }}>
            <div style={{
              height: "100%", borderRadius: 6,
              background: `linear-gradient(90deg, ${COLORS.violeta400}, ${COLORS.azul400})`,
              width: `${progreso}%`,
              transition: "width 0.4s ease",
            }} />
          </div>
          <span style={{ fontSize: 13, color: COLORS.neutro500, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
            {numeroPregunta} / {totalPreguntas}
          </span>
        </div>

        {/* Nombre del estudiante */}
        {nombreEstudiante && (
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "6px 12px", borderRadius: 20,
            background: COLORS.violeta50,
            border: `1px solid ${COLORS.violeta100}`,
          }}>
            <div style={{
              width: 22, height: 22, borderRadius: "50%",
              background: COLORS.violeta400,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 600, color: "#fff",
            }}>
              {nombreEstudiante.charAt(0).toUpperCase()}
            </div>
            <span style={{ fontSize: 13, fontWeight: 500, color: COLORS.violeta600 }}>
              {nombreEstudiante}
            </span>
          </div>
        )}
      </header>

      {/* ── Contenido central ── */}
      <main style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 24px",
        maxWidth: 680,
        margin: "0 auto",
        width: "100%",
      }}>

        {/* Instrucción de la sección — se repite en cada pregunta de la
            sección a propósito, así el alumno la tiene siempre a la vista
            aunque haya retomado la encuesta a mitad de la sección. */}
        {(instruccionTexto || instruccionImagenUrl) && (
          <div style={{
            width: "100%",
            padding: "14px 16px",
            borderRadius: 12,
            background: COLORS.azul50,
            border: `1px solid ${COLORS.azul100}`,
            marginBottom: 20,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}>
            {instruccionTexto && (
              <p style={{ margin: 0, fontSize: 14, color: COLORS.azul600, lineHeight: 1.5 }}>
                {instruccionTexto}
              </p>
            )}
            {instruccionImagenUrl && (
              <img
                src={instruccionImagenUrl}
                alt="Instrucción de esta sección"
                style={{ maxWidth: "100%", maxHeight: 160, borderRadius: 8, objectFit: "contain", alignSelf: "flex-start" }}
              />
            )}
          </div>
        )}

        {/* Indicador de pregunta */}
        <p style={{
          fontSize: 12,
          fontWeight: 500,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: COLORS.violeta400,
          margin: "0 0 16px",
          alignSelf: "flex-start",
        }}>
          Pregunta {numeroPregunta}
        </p>

        {/* Texto de la pregunta */}
        <h2 style={{
          fontSize: 22,
          fontWeight: 500,
          color: COLORS.neutro900,
          lineHeight: 1.45,
          margin: "0 0 24px",
          alignSelf: "flex-start",
        }}>
          {pregunta}
        </h2>

        {/* Imagen opcional del enunciado */}
        {imagenUrl && (
          <div style={{
            width: "100%",
            borderRadius: 12,
            overflow: "hidden",
            marginBottom: 28,
            border: `1px solid ${COLORS.neutro100}`,
            maxHeight: 240,
          }}>
            <img
              src={imagenUrl}
              alt="Imagen de apoyo para la pregunta"
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          </div>
        )}

        {/* Opciones de respuesta */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
          width: "100%",
          marginBottom: 40,
        }}>
          {opciones.map(opcion => {
            const seleccionada = valorSeleccionado === opcion.value;
            const enHover = hovered === opcion.value;

            return (
              <button
                key={opcion.value}
                onClick={() => onSeleccionar?.(opcion.value)}
                onMouseEnter={() => setHovered(opcion.value)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  width: "100%",
                  padding: "16px 20px",
                  borderRadius: 12,
                  border: `2px solid ${
                    seleccionada
                      ? COLORS.violeta400
                      : enHover
                      ? COLORS.violeta200
                      : COLORS.neutro100
                  }`,
                  background: seleccionada
                    ? COLORS.violeta50
                    : enHover
                    ? "#fafafe"
                    : "#fff",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  transition: "border-color 0.15s, background 0.15s",
                  textAlign: "left",
                }}
              >
                {/* Indicador circular */}
                <div style={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  flexShrink: 0,
                  border: `2px solid ${seleccionada ? COLORS.violeta400 : COLORS.neutro400}`,
                  background: seleccionada ? COLORS.violeta400 : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.15s",
                }}>
                  {seleccionada && (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4L3.5 6.5L9 1" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>

                {/* Etiqueta */}
                <span style={{
                  fontSize: 16,
                  fontWeight: seleccionada ? 500 : 400,
                  color: seleccionada ? COLORS.violeta600 : COLORS.neutro900,
                  transition: "color 0.15s, font-weight 0.15s",
                }}>
                  {opcion.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Navegación */}
        <div style={{
          display: "flex",
          gap: 10,
          width: "100%",
          alignItems: "center",
        }}>
          {/* Anterior */}
          <button
            onClick={onAnterior}
            disabled={esPrimera}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "13px 20px",
              borderRadius: 10,
              border: `1.5px solid ${esPrimera ? COLORS.neutro100 : COLORS.neutro100}`,
              background: "#fff",
              color: esPrimera ? COLORS.neutro400 : COLORS.neutro700,
              fontSize: 15,
              fontWeight: 500,
              cursor: esPrimera ? "not-allowed" : "pointer",
              opacity: esPrimera ? 0.5 : 1,
              transition: "opacity 0.15s",
              flexShrink: 0,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Anterior
          </button>

          {/* Siguiente / Terminar */}
          <button
            onClick={onSiguiente}
            disabled={!puedeAvanzar}
            style={{
              flex: 1,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              padding: "14px 20px",
              borderRadius: 10,
              border: "none",
              background: puedeAvanzar
                ? (esUltima ? COLORS.verde600 : COLORS.violeta400)
                : COLORS.neutro100,
              color: puedeAvanzar ? "#fff" : COLORS.neutro400,
              fontSize: 16,
              fontWeight: 600,
              cursor: puedeAvanzar ? "pointer" : "not-allowed",
              transition: "background 0.2s, color 0.2s",
              letterSpacing: "0.01em",
            }}
          >
            {esUltima ? "Terminar" : "Siguiente"}
            {!esUltima && (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
            {esUltima && (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M2 8L6 12L14 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
        </div>

        {/* Hint cuando no hay respuesta seleccionada */}
        {!puedeAvanzar && (
          <p style={{
            marginTop: 12,
            fontSize: 12,
            color: COLORS.neutro400,
            textAlign: "center",
          }}>
            Selecciona una opción para continuar
          </p>
        )}
      </main>
    </div>
  );
}