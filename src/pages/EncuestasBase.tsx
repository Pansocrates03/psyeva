import { useEffect, useMemo, useState, type FormEvent } from "react";
import Sidebar from "../components/Sidebar";
import ActionButton from "../components/ActionButton";
import Drawer from "../components/Drawer";
import COLORS from "../utils/Colors";
import StatCard from "@/components/StatCard";
import { databaseService, ApiError } from "../services/databaseService";
import { CATEGORIA_LABELS, CATEGORIAS } from "../utils/categorias";
import { RESPUESTAS_PRESETS } from "../utils/respuestasPreset";
import type { CategoriaFormulario, FormularioConTotalPreguntas } from "../utils/types";

interface IncisoForm {
  id: number;
  pregunta: string;
  respuestas: string[];
}

interface FormState {
  titulo: string;
  categoria: CategoriaFormulario;
  descripcion: string;
  incisos: IncisoForm[];
}

const CATEGORIA_META: Record<CategoriaFormulario, { bg: string; color: string; border: string }> = {
  emociones: { bg: COLORS.violeta50, color: COLORS.violeta600, border: COLORS.violeta100 },
  bienestar_psicologico: { bg: COLORS.verde50, color: COLORS.verde600, border: COLORS.verde100 },
  aprendizaje: { bg: COLORS.azul50, color: COLORS.azul600, border: COLORS.azul100 },
};

const createInciso = (): IncisoForm => ({
  id: Date.now() + Math.random(),
  pregunta: "",
  respuestas: ["", "", "", ""],
});

const emptyForm = (): FormState => ({
  titulo: "",
  categoria: "emociones",
  descripcion: "",
  incisos: [createInciso()],
});

export default function EncuestasBase() {
  const [encuestas, setEncuestas] = useState<FormularioConTotalPreguntas[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [query, setQuery] = useState("");
  const [expandedIncisos, setExpandedIncisos] = useState<Record<number, boolean>>({});
  const [filter, setFilter] = useState<CategoriaFormulario | "Todas">("Todas");

  const cargarEncuestas = () => {
    setLoading(true);
    setError(null);
    databaseService.admin.listarFormularios()
      .then(setEncuestas)
      .catch(err => setError(err instanceof ApiError ? err.message : "No se pudieron cargar las encuestas"))
      .finally(() => setLoading(false));
  };

  useEffect(cargarEncuestas, []);

  const filteredEncuestas = useMemo(() => {
    const q = query.trim().toLowerCase();
    return encuestas.filter(encuesta => {
      const matchesFilter = filter === "Todas" || encuesta.categoria === filter;
      const matchesQuery = !q || [encuesta.titulo, encuesta.descripcion ?? ""].some(value => value.toLowerCase().includes(q));
      return matchesFilter && matchesQuery;
    });
  }, [encuestas, query, filter]);

  const contarPorCategoria = (categoria: CategoriaFormulario) =>
    encuestas.filter(e => e.categoria === categoria).length;

  const openCreateDrawer = () => {
    setEditingId(null);
    setForm(emptyForm());
    setFormError(null);
    setExpandedIncisos({});
    setIsDrawerOpen(true);
  };

  const openEditDrawer = async (encuesta: FormularioConTotalPreguntas) => {
    setEditingId(encuesta.id);
    setFormError(null);
    setExpandedIncisos({});
    setIsDrawerOpen(true);
    setLoadingDetalle(true);
    try {
      const detalle = await databaseService.admin.obtenerFormulario(encuesta.id);
      setForm({
        titulo: detalle.titulo,
        categoria: detalle.categoria,
        descripcion: detalle.descripcion ?? "",
        incisos: detalle.preguntas.map(p => ({
          id: Date.now() + Math.random(),
          pregunta: p.texto,
          respuestas: p.opcionesRespuesta.map(o => o.texto),
        })),
      });
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "No se pudo cargar el detalle de la encuesta");
    } finally {
      setLoadingDetalle(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.titulo.trim()) {
      setFormError("El nombre de la encuesta es requerido.");
      return;
    }

    const preguntas = form.incisos.map(inciso => ({
      texto: inciso.pregunta.trim(),
      opcionesRespuesta: inciso.respuestas
        .map(texto => texto.trim())
        .filter(texto => texto.length > 0)
        .map((texto, index) => ({ valor: index + 1, texto })),
    }));

    if (preguntas.some(p => !p.texto || p.opcionesRespuesta.length < 2)) {
      setFormError("Cada inciso necesita una pregunta y al menos 2 respuestas.");
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      if (editingId) {
        try {
          await databaseService.admin.actualizarFormulario(editingId, {
            titulo: form.titulo.trim(),
            descripcion: form.descripcion.trim(),
            categoria: form.categoria,
            preguntas,
          });
        } catch (err) {
          if (err instanceof ApiError && err.status === 409) {
            // Ya hay respuestas registradas para las preguntas actuales:
            // guarda al menos los metadatos y avisa que las preguntas no cambiaron.
            await databaseService.admin.actualizarFormulario(editingId, {
              titulo: form.titulo.trim(),
              descripcion: form.descripcion.trim(),
              categoria: form.categoria,
            });
            setFormError(null);
            alert("Ya hay alumnos que respondieron esta encuesta, así que las preguntas no se modificaron. Sí se guardaron el nombre, categoría y descripción.");
          } else {
            throw err;
          }
        }
      } else {
        await databaseService.admin.crearFormulario({
          titulo: form.titulo.trim(),
          descripcion: form.descripcion.trim(),
          categoria: form.categoria,
          preguntas,
        });
      }

      setIsDrawerOpen(false);
      setEditingId(null);
      setForm(emptyForm());
      cargarEncuestas();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "No se pudo guardar la encuesta");
    } finally {
      setSaving(false);
    }
  };

  const eliminarEncuesta = async (id: string) => {
    if (!confirm("¿Eliminar esta encuesta? Esta acción no se puede deshacer.")) return;
    try {
      await databaseService.admin.eliminarFormulario(id);
      cargarEncuestas();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "No se pudo eliminar la encuesta");
    }
  };

  const updateIncisoPregunta = (index: number, value: string) => {
    setForm(prev => ({
      ...prev,
      incisos: prev.incisos.map((inciso, incisoIndex) => incisoIndex === index ? { ...inciso, pregunta: value } : inciso),
    }));
  };

  const updateIncisoRespuesta = (incisoIndex: number, respuestaIndex: number, value: string) => {
    setForm(prev => ({
      ...prev,
      incisos: prev.incisos.map((inciso, currentIndex) => {
        if (currentIndex !== incisoIndex) return inciso;
        const respuestas = [...inciso.respuestas];
        respuestas[respuestaIndex] = value;
        return { ...inciso, respuestas };
      }),
    }));
  };

  const applyPreset = (incisoIndex: number, presetId: string) => {
    const preset = RESPUESTAS_PRESETS.find(p => p.id === presetId);
    if (!preset) return;

    const inciso = form.incisos[incisoIndex];
    const hasContent = inciso?.respuestas.some(r => r.trim()) ?? false;
    if (hasContent && !confirm("Esto va a reemplazar las respuestas actuales de este inciso. ¿Continuar?")) {
      return;
    }

    setForm(prev => ({
      ...prev,
      incisos: prev.incisos.map((inc, i) => i === incisoIndex ? { ...inc, respuestas: [...preset.respuestas] } : inc),
    }));
  };

  const addRespuesta = (incisoIndex: number) => {
    setForm(prev => ({
      ...prev,
      incisos: prev.incisos.map((inciso, i) => i === incisoIndex ? { ...inciso, respuestas: [...inciso.respuestas, ""] } : inciso),
    }));
  };

  const removeRespuesta = (incisoIndex: number, respuestaIndex: number) => {
    setForm(prev => ({
      ...prev,
      incisos: prev.incisos.map((inciso, i) => {
        if (i !== incisoIndex || inciso.respuestas.length <= 2) return inciso;
        return { ...inciso, respuestas: inciso.respuestas.filter((_, r) => r !== respuestaIndex) };
      }),
    }));
  };

  const addInciso = () => {
    setForm(prev => ({ ...prev, incisos: [...prev.incisos, createInciso()] }));
  };

  const removeInciso = (index: number) => {
    setForm(prev => ({
      ...prev,
      incisos: prev.incisos.filter((_, incisoIndex) => incisoIndex !== index),
    }));
    setExpandedIncisos(prev => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
  };

  const toggleInciso = (index: number) => {
    setExpandedIncisos(prev => ({ ...prev, [index]: !prev[index] }));
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: COLORS.neutro50, fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <Sidebar />

      <main style={{ flex: 1, padding: "32px 40px", minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <p style={{ margin: "0 0 4px", fontSize: 12, color: COLORS.neutro500, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Gestión
            </p>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600, color: COLORS.neutro900 }}>Encuestas base</h1>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <input
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Buscar encuesta..."
              style={{ padding: "9px 14px", borderRadius: 8, border: `1px solid ${COLORS.neutro100}`, fontSize: 14, outline: "none", width: 200 }}
            />
            <button
              onClick={openCreateDrawer}
              style={{
                display: "flex", alignItems: "center", gap: 7,
                padding: "9px 16px", borderRadius: 8,
                background: COLORS.violeta400, border: "none",
                color: "#fff", fontSize: 14, fontWeight: 500, cursor: "pointer",
              }}
            >
              <i className="ti ti-plus" style={{ fontSize: 15 }} aria-hidden="true" />
              Nueva encuesta
            </button>
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
          <StatCard label="Total de encuestas" accent={filter === "Todas"} onClick={() => setFilter("Todas")} value={encuestas.length} />
          {CATEGORIAS.map(categoria => (
            <StatCard
              key={categoria}
              label={CATEGORIA_LABELS[categoria]}
              accent={filter === categoria}
              onClick={() => setFilter(categoria)}
              value={contarPorCategoria(categoria)}
            />
          ))}
        </div>

        <div style={{ background: "#fff", border: `1px solid ${COLORS.neutro100}`, borderRadius: 14, overflow: "hidden" }}>
          {error ? (
            <div style={{ padding: "32px 20px", textAlign: "center", color: COLORS.rojo600 }}>{error}</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: COLORS.neutro50 }}>
                  {[
                    { label: "Encuesta", align: "left" },
                    { label: "Categoría", align: "left" },
                    { label: "Preguntas", align: "left" },
                    { label: "Acciones", align: "right" },
                  ].map(column => (
                    <th key={column.label} style={{ padding: "10px 20px", textAlign: column.align as "left" | "right", fontSize: 12, fontWeight: 600, color: COLORS.neutro500, textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: `1px solid ${COLORS.neutro100}` }}>
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredEncuestas.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ padding: "16px 20px", textAlign: "center", color: COLORS.neutro500 }}>
                      {loading ? "Cargando encuestas..." : "No hay encuestas para mostrar."}
                    </td>
                  </tr>
                ) : filteredEncuestas.map((encuesta, index) => {
                  const meta = CATEGORIA_META[encuesta.categoria];
                  return (
                    <tr key={encuesta.id} style={{ borderBottom: index < filteredEncuestas.length - 1 ? `1px solid ${COLORS.neutro50}` : "none" }}>
                      <td style={{ padding: "14px 20px", fontWeight: 600, color: COLORS.neutro900 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 32, height: 32, borderRadius: 8, background: COLORS.violeta50, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <i className="ti ti-clipboard-list" style={{ fontSize: 16, color: COLORS.violeta400 }} aria-hidden="true" />
                          </div>
                          <div>
                            <div>{encuesta.titulo}</div>
                            <div style={{ fontSize: 12, color: COLORS.neutro500 }}>{encuesta.descripcion}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "14px 20px" }}>
                        <span style={{ display: "inline-flex", padding: "4px 8px", borderRadius: 999, fontSize: 12, fontWeight: 600, background: meta.bg, color: meta.color, border: `1px solid ${meta.border}` }}>
                          {CATEGORIA_LABELS[encuesta.categoria]}
                        </span>
                      </td>
                      <td style={{ padding: "14px 20px", color: COLORS.neutro700 }}>{encuesta.totalPreguntas}</td>
                      <td style={{ padding: "14px 20px" }}>
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                          <ActionButton label="Editar" onClick={() => openEditDrawer(encuesta)} />
                          <ActionButton label="Eliminar" variant="danger" onClick={() => eliminarEncuesta(encuesta.id)} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </main>

      <Drawer open={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} title={editingId ? "Editar encuesta" : "Crear encuesta"}>
        {loadingDetalle ? (
          <p style={{ fontSize: 14, color: COLORS.neutro500 }}>Cargando encuesta...</p>
        ) : (
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: COLORS.neutro700, marginBottom: 6 }}>Nombre de la encuesta</label>
            <input
              value={form.titulo}
              onChange={event => setForm(prev => ({ ...prev, titulo: event.target.value }))}
              placeholder="Ej. Bienestar emocional"
              style={{ width: "100%", padding: "9px 12px", border: `1px solid ${COLORS.neutro100}`, borderRadius: 8, fontSize: 14, color: COLORS.neutro900, outline: "none", boxSizing: "border-box" }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: COLORS.neutro700, marginBottom: 6 }}>Categoría</label>
            <select
              value={form.categoria}
              onChange={event => setForm(prev => ({ ...prev, categoria: event.target.value as CategoriaFormulario }))}
              style={{ width: "100%", padding: "9px 12px", border: `1px solid ${COLORS.neutro100}`, borderRadius: 8, fontSize: 14, color: COLORS.neutro900, outline: "none", boxSizing: "border-box" }}
            >
              {CATEGORIAS.map(categoria => (
                <option key={categoria} value={categoria}>{CATEGORIA_LABELS[categoria]}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: COLORS.neutro700, marginBottom: 6 }}>Descripción</label>
            <textarea
              value={form.descripcion}
              onChange={event => setForm(prev => ({ ...prev, descripcion: event.target.value }))}
              placeholder="Describe el objetivo de la encuesta"
              rows={4}
              style={{ width: "100%", padding: "9px 12px", border: `1px solid ${COLORS.neutro100}`, borderRadius: 8, fontSize: 14, color: COLORS.neutro900, outline: "none", boxSizing: "border-box", resize: "vertical" }}
            />
          </div>

          <div style={{ border: `1px solid ${COLORS.neutro100}`, borderRadius: 12, padding: 14, background: COLORS.neutro50 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.neutro900 }}>Incisos</div>
                <div style={{ fontSize: 12, color: COLORS.neutro500 }}>Cada inciso tiene una pregunta y sus opciones de respuesta.</div>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {form.incisos.map((inciso, index) => {
                const isExpanded = expandedIncisos[index] ?? false;
                return (
                  <div key={inciso.id} style={{ background: "#fff", border: `1px solid ${COLORS.neutro100}`, borderRadius: 10, padding: 12 }}>
                    <button
                      type="button"
                      onClick={() => toggleInciso(index)}
                      style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", background: "transparent", border: "none", padding: 0, cursor: "pointer", textAlign: "left" }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 24, height: 24, borderRadius: 999, background: COLORS.violeta50, color: COLORS.violeta600, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700 }}>
                          {index + 1}
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.neutro900 }}>
                          {inciso.pregunta.trim() || `Inciso ${index + 1}`}
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 12, color: COLORS.neutro500 }}>{isExpanded ? "Ocultar" : "Editar"}</span>
                        <i className={`ti ${isExpanded ? "ti-chevron-up" : "ti-chevron-down"}`} style={{ fontSize: 14, color: COLORS.neutro500 }} />
                      </div>
                    </button>

                    {isExpanded && (
                      <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                        <div style={{ display: "flex", justifyContent: "flex-end" }}>
                          {form.incisos.length > 1 && (
                            <button type="button" onClick={() => removeInciso(index)} style={{ border: "none", background: "transparent", color: COLORS.neutro500, cursor: "pointer", fontSize: 15 }} aria-label="Eliminar inciso">
                              <i className="ti ti-trash" />
                            </button>
                          )}
                        </div>

                        <div>
                          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: COLORS.neutro700, marginBottom: 6 }}>Pregunta del inciso</label>
                          <input
                            value={inciso.pregunta}
                            onChange={event => updateIncisoPregunta(index, event.target.value)}
                            placeholder={`Escribe la pregunta del inciso ${index + 1}`}
                            style={{ width: "100%", padding: "9px 12px", border: `1px solid ${COLORS.neutro100}`, borderRadius: 8, fontSize: 14, color: COLORS.neutro900, outline: "none", boxSizing: "border-box" }}
                          />
                        </div>

                        <div>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6, gap: 8 }}>
                            <label style={{ fontSize: 12, fontWeight: 600, color: COLORS.neutro700 }}>Respuestas posibles</label>
                            <select
                              value=""
                              onChange={event => {
                                if (event.target.value) applyPreset(index, event.target.value);
                              }}
                              style={{ padding: "5px 8px", border: `1px solid ${COLORS.violeta200}`, borderRadius: 6, fontSize: 12, color: COLORS.violeta600, background: COLORS.violeta50, outline: "none" }}
                            >
                              <option value="">Respuestas rápidas...</option>
                              {RESPUESTAS_PRESETS.map(preset => (
                                <option key={preset.id} value={preset.id}>{preset.label}</option>
                              ))}
                            </select>
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {inciso.respuestas.map((respuesta, respuestaIndex) => (
                              <div key={respuestaIndex} style={{ display: "flex", gap: 6 }}>
                                <input
                                  value={respuesta}
                                  onChange={event => updateIncisoRespuesta(index, respuestaIndex, event.target.value)}
                                  placeholder={`Opción ${respuestaIndex + 1}`}
                                  style={{ flex: 1, padding: "9px 12px", border: `1px solid ${COLORS.neutro100}`, borderRadius: 8, fontSize: 14, color: COLORS.neutro900, outline: "none", boxSizing: "border-box" }}
                                />
                                {inciso.respuestas.length > 2 && (
                                  <button type="button" onClick={() => removeRespuesta(index, respuestaIndex)} style={{ border: "none", background: "transparent", color: COLORS.neutro400, cursor: "pointer" }} aria-label="Eliminar opción">
                                    <i className="ti ti-x" />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                          <button type="button" onClick={() => addRespuesta(index)} style={{ marginTop: 8, border: "none", background: "transparent", color: COLORS.violeta600, cursor: "pointer", fontSize: 12, fontWeight: 600, padding: 0 }}>
                            + Añadir opción
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div style={{ background: COLORS.neutro50 }}>
              <button type="button" onClick={addInciso} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px dashed ${COLORS.violeta200}`, background: COLORS.violeta50, color: COLORS.violeta600, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                + Añadir inciso
              </button>
            </div>
          </div>

          {formError && <p style={{ margin: 0, fontSize: 13, color: COLORS.rojo600 }}>{formError}</p>}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, paddingTop: 6 }}>
            <button type="button" onClick={() => setIsDrawerOpen(false)} style={{ padding: "9px 16px", borderRadius: 8, background: "none", border: `1px solid ${COLORS.neutro100}`, color: COLORS.neutro700, fontSize: 14, cursor: "pointer" }}>
              Cancelar
            </button>
            <button type="submit" disabled={saving} style={{ padding: "9px 16px", borderRadius: 8, background: COLORS.violeta400, border: "none", color: "#fff", fontSize: 14, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1 }}>
              {saving ? "Guardando..." : editingId ? "Guardar cambios" : "Crear encuesta"}
            </button>
          </div>
        </form>
        )}
      </Drawer>
    </div>
  );
}
