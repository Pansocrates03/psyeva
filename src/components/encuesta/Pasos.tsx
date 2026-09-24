import React, { useState } from "react";
import COLORS from "@/utils/Colors";
import { CATEGORIA_LABELS } from "@/utils/categorias";
import type {
  CategoriaFormulario,
  EstudianteConEstado,
  GrupoConProgreso,
  PreguntaSesion,
} from "@/utils/types";

export interface FormularioDisponible {
  categoria: CategoriaFormulario;
  formularioId: string;
  titulo: string;
}

export const cardStyle: React.CSSProperties = {
  background: "#fff",
  borderRadius: 16,
  boxShadow: "0 4px 24px rgba(0,0,0,0.10)",
  width: 380,
  overflow: "hidden",
};

export const cardBodyStyle: React.CSSProperties = {
  padding: "20px 24px 24px",
};

export function BienvenidaStep({ onContinue }: { onContinue: () => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
      <img
        src="/assets/eva_2.png"
        alt="Bienvenida"
        style={{
          display: "block",
          width: "min(100%, 420px)",
          maxHeight: "calc(100vh - 100px)",
          objectFit: "contain",
        }}
      />
      <div style={{ width: 180 }}>
        <BtnPrimario label="Siguiente" onClick={onContinue} />
      </div>
    </div>
  );
}

const cardHeaderStyle: React.CSSProperties = {
  padding: "18px 24px 14px",
  borderBottom: `1px solid ${COLORS.neutro100}`,
};

const CATEGORIA_COLOR: Record<CategoriaFormulario, { color: string; colorText: string }> = {
  emociones: { color: COLORS.violeta50, colorText: COLORS.violeta600 },
  bienestar_psicologico: { color: COLORS.verde50, colorText: COLORS.verde600 },
  aprendizaje: { color: COLORS.azul50, colorText: COLORS.azul600 },
};

function estadoPorCategoria(estudiante: EstudianteConEstado, categoria: CategoriaFormulario) {
  if (categoria === "emociones") return estudiante.estadoEmociones;
  if (categoria === "bienestar_psicologico") return estudiante.estadoBienestar;
  return estudiante.estadoAprendizaje;
}

function formulariosDelGrupo(grupo: GrupoConProgreso): FormularioDisponible[] {
  const posibles: Array<[CategoriaFormulario, string | null | undefined, string | null | undefined]> = [
    ["emociones", grupo.formEmocionesId, grupo.formEmocionesTitulo],
    ["bienestar_psicologico", grupo.formBienpsicId, grupo.formBienpsicTitulo],
    ["aprendizaje", grupo.formAprendizajeId, grupo.formAprendizajeTitulo],
  ];
  return posibles
    .filter((p): p is [CategoriaFormulario, string, string] => Boolean(p[1]))
    .map(([categoria, formularioId, titulo]) => ({ categoria, formularioId, titulo }));
}

function BtnPrimario({ label, onClick, disabled = false }: {
  label: string; onClick: () => void; disabled?: boolean;
}) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width: "100%", padding: "11px 20px", borderRadius: 8, border: "none",
      background: disabled ? COLORS.neutro100 : COLORS.violeta400,
      color: disabled ? COLORS.neutro400 : "#fff",
      fontSize: 14, fontWeight: 600,
      cursor: disabled ? "not-allowed" : "pointer",
      transition: "background 0.15s",
    }}>
      {label}
    </button>
  );
}

function BtnSecundario({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      padding: "11px 20px", borderRadius: 8,
      border: `1.5px solid ${COLORS.neutro100}`,
      background: "#fff", color: COLORS.neutro700,
      fontSize: 14, fontWeight: 500, cursor: "pointer",
    }}>
      {label}
    </button>
  );
}

export function LogoHeader({ escuela, grupo }: { escuela?: string; grupo?: string }) {
  return (
    <div style={cardHeaderStyle}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8, background: COLORS.violeta400,
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <div style={{ width: 14, height: 14, borderRadius: 3, background: COLORS.verde400 }} />
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.neutro900 }}>{escuela ?? "PSYEVA"}</div>
          {grupo && <div style={{ fontSize: 11, color: COLORS.neutro500 }}>{grupo}</div>}
        </div>
      </div>
    </div>
  );
}

export function SeleccionarGrupoStep({ escuela, grupos, onBack, onContinue }: {
  escuela: string; grupos: GrupoConProgreso[]; onBack: () => void; onContinue: (grupo: GrupoConProgreso) => void;
}) {
  return (
    <div style={{ ...cardStyle, width: 420 }}>
      <LogoHeader escuela={escuela} />
      <div style={cardBodyStyle}>
        <h2 style={{ margin: "0 0 4px", fontSize: 17, fontWeight: 600, color: COLORS.neutro900 }}>
          Selecciona el grupo
        </h2>
        <p style={{ margin: "0 0 18px", fontSize: 13, color: COLORS.neutro500 }}>
          Toca el grupo que va a realizar la evaluación hoy.
        </p>
        {grupos.length === 0 ? (
          <p style={{ margin: "0 0 20px", fontSize: 13, color: COLORS.neutro400, textAlign: "center" }}>
            Esta evaluación todavía no tiene grupos configurados.
          </p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10, marginBottom: 20 }}>
            {grupos.map(g => (
              <button
                key={g.grupoId}
                onClick={() => onContinue(g)}
                style={{
                  padding: "18px 12px", borderRadius: 12,
                  border: `1.5px solid ${COLORS.neutro100}`, background: "#fff",
                  cursor: "pointer", fontSize: 16, fontWeight: 600,
                  color: COLORS.neutro900, textAlign: "center" as const,
                  transition: "border-color 0.15s, background 0.15s, color 0.15s",
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget;
                  el.style.borderColor = COLORS.violeta400;
                  el.style.background = COLORS.violeta50;
                  el.style.color = COLORS.violeta600;
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget;
                  el.style.borderColor = COLORS.neutro100;
                  el.style.background = "#fff";
                  el.style.color = COLORS.neutro900;
                }}
              >
                {g.grupoNombre}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function SeleccionarFormularioStep({ escuela, grupo, onBack, onContinue }: {
  escuela: string; grupo: GrupoConProgreso; onBack: () => void; onContinue: (formulario: FormularioDisponible) => void;
}) {
  const disponibles = formulariosDelGrupo(grupo);

  return (
    <div style={cardStyle}>
      <LogoHeader escuela={escuela} grupo={grupo.grupoNombre} />
      <div style={cardBodyStyle}>
        <h2 style={{ margin: "0 0 4px", fontSize: 17, fontWeight: 600, color: COLORS.neutro900 }}>Área a evaluar</h2>
        <p style={{ margin: "0 0 18px", fontSize: 13, color: COLORS.neutro500 }}>Toca el formulario que van a responder hoy.</p>
        {disponibles.length === 0 ? (
          <p style={{ margin: "0 0 20px", fontSize: 13, color: COLORS.neutro400, textAlign: "center" }}>
            Este grupo no tiene encuestas asignadas todavía.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
            {disponibles.map(formulario => {
              const meta = CATEGORIA_COLOR[formulario.categoria];
              return (
                <button
                  key={formulario.formularioId}
                  onClick={() => onContinue(formulario)}
                  style={{
                    width: "100%", padding: "18px 20px", borderRadius: 12,
                    border: `1.5px solid ${COLORS.neutro100}`, background: "#fff", cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 14, textAlign: "left" as const,
                    transition: "border-color 0.15s, background 0.15s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = meta.colorText; e.currentTarget.style.background = meta.color; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = COLORS.neutro100; e.currentTarget.style.background = "#fff"; }}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    background: meta.color, border: `1.5px solid ${meta.colorText}20`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <div style={{ width: 14, height: 14, borderRadius: "50%", background: meta.colorText, opacity: 0.7 }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: COLORS.neutro500, textTransform: "uppercase", letterSpacing: "0.04em" }}>{CATEGORIA_LABELS[formulario.categoria]}</div>
                    <div style={{ fontSize: 16, fontWeight: 600, color: COLORS.neutro900 }}>{formulario.titulo}</div>
                  </div>
                  <div style={{ marginLeft: "auto" }}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 4L10 8L6 12" stroke={COLORS.neutro400} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </div>
                </button>
              );
            })}
          </div>
        )}
        <BtnSecundario label="Atrás" onClick={onBack} />
      </div>
    </div>
  );
}

export function SeleccionarAlumnoStep({ escuela, grupo, formulario, estudiantes, onBack, onContinue }: {
  escuela: string; grupo: GrupoConProgreso; formulario: FormularioDisponible; estudiantes: EstudianteConEstado[];
  onBack: () => void; onContinue: (alumno: EstudianteConEstado) => void;
}) {
  const [alumnoSel, setAlumnoSel] = useState<EstudianteConEstado | null>(null);
  const pendientes = estudiantes.filter(e => estadoPorCategoria(e, formulario.categoria) !== "completada");

  return (
    <div style={{ ...cardStyle, width: 420 }}>
      <LogoHeader escuela={escuela} grupo={`${grupo.grupoNombre} · ${CATEGORIA_LABELS[formulario.categoria]}`} />
      <div style={cardBodyStyle}>
        <h2 style={{ margin: "0 0 4px", fontSize: 17, fontWeight: 600, color: COLORS.neutro900 }}>¿Quién va a responder?</h2>
        <p style={{ margin: "0 0 14px", fontSize: 13, color: COLORS.neutro500 }}>{pendientes.length} alumnos pendientes · toca un nombre para seleccionar.</p>
        <div style={{ border: `1px solid ${COLORS.neutro100}`, borderRadius: 12, overflow: "hidden", marginBottom: 18, maxHeight: 340, overflowY: "auto" }}>
          {pendientes.length === 0 ? (
            <div style={{ padding: "28px", textAlign: "center" as const, fontSize: 14, color: COLORS.neutro400 }}>Todos los alumnos han completado esta encuesta ✓</div>
          ) : pendientes.map((a, idx) => {
            const sel = alumnoSel?.estudianteId === a.estudianteId;
            return (
              <div
                key={a.estudianteId}
                onClick={() => setAlumnoSel(sel ? null : a)}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", borderBottom: idx < pendientes.length - 1 ? `1px solid ${COLORS.neutro50}` : "none", background: sel ? COLORS.violeta50 : "#fff", cursor: "pointer", transition: "background 0.1s" }}
                onMouseEnter={e => { if (!sel) e.currentTarget.style.background = COLORS.neutro50; }}
                onMouseLeave={e => { if (!sel) e.currentTarget.style.background = "#fff"; }}
              >
                <div style={{ width: 34, height: 34, borderRadius: "50%", flexShrink: 0, background: sel ? COLORS.violeta400 : COLORS.neutro100, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 600, color: sel ? "#fff" : COLORS.neutro500, transition: "all 0.15s" }}>{a.nombreCompleto.charAt(0)}</div>
                <span style={{ fontSize: 14, flex: 1, color: sel ? COLORS.violeta700 : COLORS.neutro900, fontWeight: sel ? 600 : 400 }}>{a.nombreCompleto}</span>
                {sel && <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0 }}><circle cx="10" cy="10" r="10" fill={COLORS.violeta400} /><path d="M5.5 10L8.5 13L14.5 7" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>}
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <BtnSecundario label="Atrás" onClick={onBack} />
          <div style={{ flex: 1 }}><BtnPrimario label="Comenzar" onClick={() => alumnoSel && onContinue(alumnoSel)} disabled={!alumnoSel} /></div>
        </div>
      </div>
    </div>
  );
}

export function ConfirmacionStep({ alumno, formulario, iniciando, onIniciar }: {
  alumno: EstudianteConEstado; formulario: FormularioDisponible; iniciando: boolean; onIniciar: () => void;
}) {
  return (
    <div style={{ ...cardStyle, width: 380 }}>
      <LogoHeader escuela={formulario.titulo} />
      <div style={{ ...cardBodyStyle, textAlign: "center" as const, padding: "36px 24px" }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
        <h2 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 600, color: COLORS.neutro900 }}>¡Listo, {alumno.nombreCompleto.split(" ")[0]}!</h2>
        <p style={{ margin: "0 0 24px", fontSize: 14, color: COLORS.neutro500 }}>Vas a responder la evaluación de <strong>{CATEGORIA_LABELS[formulario.categoria]}</strong>.<br />Toca "Comenzar" cuando estés listo.</p>
        <BtnPrimario label={iniciando ? "Cargando..." : "Comenzar"} onClick={onIniciar} disabled={iniciando} />
      </div>
    </div>
  );
}

export function InstruccionStep({ pregunta, nombreEstudiante, onContinue }: {
  pregunta: PreguntaSesion; nombreEstudiante: string; onContinue: () => void;
}) {
  const [imagenDisponible, setImagenDisponible] = useState(Boolean(pregunta.instruccionImagenUrl));

  return (
    <div style={{ ...cardStyle, width: "min(680px, calc(100vw - 32px))" }}>
      <LogoHeader grupo={nombreEstudiante} />
      <div style={{ ...cardBodyStyle, textAlign: "center" as const, padding: "32px 24px 24px" }}>
        <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 600, color: COLORS.violeta400, textTransform: "uppercase", letterSpacing: "0.08em" }}>Instrucciones de esta sección</p>
        {pregunta.instruccionImagenUrl && imagenDisponible ? (
          <img src={pregunta.instruccionImagenUrl} alt="Instrucciones de esta sección" onError={() => setImagenDisponible(false)} style={{ display: "block", width: "100%", maxHeight: "65vh", objectFit: "contain", margin: "0 auto 28px", borderRadius: 12 }} />
        ) : (
          <p style={{ margin: "20px 0 28px", fontSize: 20, lineHeight: 1.5, color: COLORS.neutro900 }}>{pregunta.instruccionTexto}</p>
        )}
        <BtnPrimario label="Siguiente" onClick={onContinue} />
      </div>
    </div>
  );
}

export function CompletadoStep({ alumno, onSiguienteAlumno }: { alumno: EstudianteConEstado; onSiguienteAlumno: () => void }) {
  return (
    <div style={{ ...cardStyle, width: 380 }}>
      <div style={{ ...cardBodyStyle, textAlign: "center" as const, padding: "40px 24px" }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
        <h2 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 600, color: COLORS.neutro900 }}>¡Gracias, {alumno.nombreCompleto.split(" ")[0]}!</h2>
        <p style={{ margin: "0 0 24px", fontSize: 14, color: COLORS.neutro500 }}>Tus respuestas fueron guardadas correctamente.</p>
      </div>
    </div>
  );
}
