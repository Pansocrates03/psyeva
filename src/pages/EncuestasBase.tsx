import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import Sidebar from "../components/Sidebar";
import ActionButton from "../components/ActionButton";
import Drawer from "../components/Drawer";
import COLORS from "../utils/Colors";
import StatCard from "@/components/StatCard";

type CategoriaEncuesta = "Emociones" | "Bienestar Psicológico" | "Aprendizaje";

interface EncuestaBase {
  id: number;
  nombre: string;
  categoria: CategoriaEncuesta;
  preguntas: number;
  descripcion: string;
  fecha: string;
}

interface IncisoForm {
  id: number;
  pregunta: string;
  imagen: string;
  respuestas: [string, string, string, string];
}

interface FormState {
  nombre: string;
  categoria: CategoriaEncuesta;
  descripcion: string;
  incisos: IncisoForm[];
}

const INITIAL_ENCUESTAS: EncuestaBase[] = [
  { id: 1, nombre: "Bienestar emocional", categoria: "Emociones", preguntas: 12, descripcion: "Evalúa el estado emocional general del estudiante.", fecha: "14 nov 2026" },
  { id: 2, nombre: "Hábitos de estudio", categoria: "Aprendizaje", preguntas: 15, descripcion: "Identifica rutinas y estrategias de estudio.", fecha: "2 dic 2026" },
  { id: 3, nombre: "Clima escolar", categoria: "Bienestar Psicológico", preguntas: 10, descripcion: "Mide la percepción del ambiente escolar.", fecha: "9 ene 2027" },
  { id: 4, nombre: "Autoestima inicial", categoria: "Aprendizaje", preguntas: 8, descripcion: "Encuesta previa utilizada en el ciclo anterior.", fecha: "21 mar 2026" },
];

const CATEGORIA_META: Record<CategoriaEncuesta, { label: string; bg: string; color: string; border: string }> = {
  "Emociones": { label: "Emociones", bg: COLORS.violeta50, color: COLORS.violeta600, border: COLORS.violeta100 },
  "Bienestar Psicológico": { label: "Bienestar Psicológico", bg: COLORS.verde50, color: COLORS.verde600, border: COLORS.verde100 },
  "Aprendizaje": { label: "Aprendizaje", bg: COLORS.azul50, color: COLORS.azul600, border: COLORS.azul100 },
};

const createInciso = (): IncisoForm => ({
  id: Date.now() + Math.random(),
  pregunta: "",
  imagen: "",
  respuestas: ["", "", "", ""],
});

const emptyForm = (): FormState => ({
  nombre: "",
  categoria: "Emociones",
  descripcion: "",
  incisos: [createInciso()],
});

export default function EncuestasBase() {
  const [encuestas, setEncuestas] = useState<EncuestaBase[]>(INITIAL_ENCUESTAS);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingEncuesta, setEditingEncuesta] = useState<EncuestaBase | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [query, setQuery] = useState("");
  const [expandedIncisos, setExpandedIncisos] = useState<Record<number, boolean>>({});
  const [filter, setFilter] = useState<CategoriaEncuesta | "Todas">("Todas");

  const filteredEncuestas = useMemo(() => {
    const q = query.trim().toLowerCase();
    return encuestas.filter(encuesta => {
      const matchesFilter = filter === "Todas" || encuesta.categoria === filter;
      const matchesQuery = !q || [encuesta.nombre, encuesta.categoria, encuesta.descripcion].some(value => value.toLowerCase().includes(q));
      return matchesFilter && matchesQuery;
    });
  }, [encuestas, query, filter]);

  const totalPreguntas = encuestas.reduce((sum, encuesta) => sum + encuesta.preguntas, 0);


  const openCreateDrawer = () => {
    setEditingEncuesta(null);
    setForm(emptyForm());
    setIsDrawerOpen(true);
  };

  const openEditDrawer = (encuesta: EncuestaBase) => {
    setEditingEncuesta(encuesta);
    setForm({
      nombre: encuesta.nombre,
      categoria: encuesta.categoria,
      descripcion: encuesta.descripcion,
      incisos: Array.from({ length: Math.max(encuesta.preguntas, 1) }, () => createInciso()),
    });
    setIsDrawerOpen(true);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.nombre.trim() || !form.categoria.trim()) {
      return;
    }

    const payload: EncuestaBase = {
      id: editingEncuesta?.id ?? Date.now(),
      nombre: form.nombre.trim(),
      categoria: form.categoria,
      preguntas: form.incisos.length,
      descripcion: form.descripcion.trim(),
      fecha: editingEncuesta?.fecha ?? new Date().toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" }),
    };

    if (editingEncuesta) {
      setEncuestas(prev => prev.map(encuesta => encuesta.id === editingEncuesta.id ? payload : encuesta));
    } else {
      setEncuestas(prev => [payload, ...prev]);
    }

    setIsDrawerOpen(false);
    setEditingEncuesta(null);
    setForm(emptyForm());
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

        const respuestas = [...inciso.respuestas] as [string, string, string, string];
        respuestas[respuestaIndex] = value;
        return { ...inciso, respuestas };
      }),
    }));
  };

  const handleImageUpload = (index: number, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    setForm(prev => ({
      ...prev,
      incisos: prev.incisos.map((inciso, incisoIndex) => incisoIndex === index ? { ...inciso, imagen: previewUrl } : inciso),
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
          <button
            onClick={openCreateDrawer}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              padding: "9px 16px",
              borderRadius: 8,
              background: COLORS.violeta400,
              border: "none",
              color: "#fff",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            <i className="ti ti-plus" style={{ fontSize: 15 }} aria-hidden="true" />
            Nueva encuesta
          </button>
        </div>


        <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
          <StatCard label="Total de encuestas" accent={filter === "Todas"} onClick={() => setFilter('Todas')} value={encuestas.length} />
          <StatCard label="Encuestas de aprendizaje" accent={filter === "Aprendizaje"} onClick={() => setFilter('Aprendizaje')} value={encuestas.filter(e => e.categoria === "Aprendizaje").length} />
          <StatCard label="Encuestas de bienestar" accent={filter === "Bienestar Psicológico"} onClick={() => setFilter('Bienestar Psicológico')} value={encuestas.filter(e => e.categoria === "Bienestar Psicológico").length} />
          <StatCard label="Encuestas de emociones" accent={filter === "Emociones"} onClick={() => setFilter('Emociones')} value={encuestas.filter(e => e.categoria === "Emociones").length} />
        </div>


   

        <div style={{ background: "#fff", border: `1px solid ${COLORS.neutro100}`, borderRadius: 14, overflow: "hidden" }}>


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
              {filteredEncuestas.map((encuesta, index) => {
                const meta = CATEGORIA_META[encuesta.categoria];
                return (
                  <tr key={encuesta.id} style={{ borderBottom: index < filteredEncuestas.length - 1 ? `1px solid ${COLORS.neutro50}` : "none" }}>
                    <td style={{ padding: "14px 20px", fontWeight: 600, color: COLORS.neutro900 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: COLORS.violeta50, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <i className="ti ti-clipboard-list" style={{ fontSize: 16, color: COLORS.violeta400 }} aria-hidden="true" />
                        </div>
                        <div>
                          <div>{encuesta.nombre}</div>
                          <div style={{ fontSize: 12, color: COLORS.neutro500 }}>{encuesta.descripcion}</div>
                        </div>
                      </div>
                    </td>
                    {/* Estado */}
                    <td style={{ padding: "14px 20px" }}>
                      <span style={{ display: "inline-flex", padding: "4px 8px", borderRadius: 999, fontSize: 12, fontWeight: 600, background: meta.bg, color: meta.color, border: `1px solid ${meta.border}` }}>
                        {meta.label}
                      </span>
                    </td>
                    {/* Preguntas */}
                    <td style={{ padding: "14px 20px", color: COLORS.neutro700 }}>{encuesta.preguntas}</td>
                    
                    {/* Acciones */}
                    <td style={{ padding: "14px 20px" }}>
                      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                        <ActionButton label="Editar" onClick={() => openEditDrawer(encuesta)} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>

      <Drawer open={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} title={editingEncuesta ? "Editar encuesta" : "Crear encuesta"}>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: COLORS.neutro700, marginBottom: 6 }}>Nombre de la encuesta</label>
            <input
              value={form.nombre}
              onChange={event => setForm(prev => ({ ...prev, nombre: event.target.value }))}
              placeholder="Ej. Bienestar emocional"
              style={{ width: "100%", padding: "9px 12px", border: `1px solid ${COLORS.neutro100}`, borderRadius: 8, fontSize: 14, color: COLORS.neutro900, outline: "none", boxSizing: "border-box" }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: COLORS.neutro700, marginBottom: 6 }}>Categoría</label>
            <select
              value={form.categoria}
              onChange={event => setForm(prev => ({ ...prev, categoria: event.target.value as CategoriaEncuesta }))}
              style={{ width: "100%", padding: "9px 12px", border: `1px solid ${COLORS.neutro100}`, borderRadius: 8, fontSize: 14, color: COLORS.neutro900, outline: "none", boxSizing: "border-box" }}
            >
              <option value="Emociones">Emociones</option>
              <option value="Bienestar Psicológico">Bienestar Psicológico</option>
              <option value="Aprendizaje">Aprendizaje</option>
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
                <div style={{ fontSize: 12, color: COLORS.neutro500 }}>Cada inciso puede incluir una pregunta, una imagen y cuatro respuestas.</div>
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
                          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: COLORS.neutro700, marginBottom: 6 }}>Imagen de apoyo</label>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={event => handleImageUpload(index, event)}
                            style={{ width: "100%", fontSize: 13, color: COLORS.neutro700 }}
                          />
                          {inciso.imagen && (
                            <img src={inciso.imagen} alt={`Previsualización inciso ${index + 1}`} style={{ width: "100%", maxHeight: 180, objectFit: "cover", borderRadius: 8, marginTop: 8, border: `1px solid ${COLORS.neutro100}` }} />
                          )}
                        </div>

                        <div>
                          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: COLORS.neutro700, marginBottom: 6 }}>Respuestas posibles</label>
                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {inciso.respuestas.map((respuesta, respuestaIndex) => (
                              <input
                                key={`${inciso.id}-${respuestaIndex}`}
                                value={respuesta}
                                onChange={event => updateIncisoRespuesta(index, respuestaIndex, event.target.value)}
                                placeholder={`Opción ${respuestaIndex + 1}`}
                                style={{ width: "100%", padding: "9px 12px", border: `1px solid ${COLORS.neutro100}`, borderRadius: 8, fontSize: 14, color: COLORS.neutro900, outline: "none", boxSizing: "border-box" }}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div style={{background: COLORS.neutro50 }}>
              <button type="button" onClick={addInciso} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px dashed ${COLORS.violeta200}`, background: COLORS.violeta50, color: COLORS.violeta600, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                + Añadir inciso
              </button>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, paddingTop: 6 }}>
            <button type="button" onClick={() => setIsDrawerOpen(false)} style={{ padding: "9px 16px", borderRadius: 8, background: "none", border: `1px solid ${COLORS.neutro100}`, color: COLORS.neutro700, fontSize: 14, cursor: "pointer" }}>
              Cancelar
            </button>
            <button type="submit" style={{ padding: "9px 16px", borderRadius: 8, background: COLORS.violeta400, border: "none", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
              {editingEncuesta ? "Guardar cambios" : "Crear encuesta"}
            </button>
          </div>
        </form>
      </Drawer>
    </div>
  );
}
