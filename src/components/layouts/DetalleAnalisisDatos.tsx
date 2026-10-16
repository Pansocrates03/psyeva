import Table from "../../components/Table";
import COLORS from "../../utils/Colors";
import ActionButton from "../ActionButton";
import type { GrupoRespuestas } from "../../utils/types";

type FilaDatos = GrupoRespuestas["estudiantes"][number] & { grupoNombre: string };

export default function DetalleAnalisisDatos({
  preguntas,
  estudiantes,
  loading,
  grupos,
  grupoSeleccionadoId,
  onSeleccionarGrupo,
  onExportar,
  onClose,
}: {
  preguntas: GrupoRespuestas["preguntas"];
  estudiantes: FilaDatos[];
  loading?: boolean;
  grupos: Array<{ id: string; nombre: string }>;
  grupoSeleccionadoId: string;
  onSeleccionarGrupo: (grupoId: string) => void;
  onExportar: () => void;
  onClose: () => void;
}) {
  return (
    <div style={{ marginTop: 24, background: "#fff", border: `1px solid ${COLORS.neutro100}`, borderRadius: 14, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: `1px solid ${COLORS.neutro100}` }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: COLORS.neutro900 }}>Respuestas por estudiante</h3>
          <div style={{ fontSize: 12, color: COLORS.neutro500, marginTop: 2 }}>{estudiantes.length} registros disponibles</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <label htmlFor="grupo-resultados" style={{ fontSize: 13, color: COLORS.neutro700 }}>Grupo</label>
          <select
            id="grupo-resultados"
            value={grupoSeleccionadoId}
            onChange={event => onSeleccionarGrupo(event.target.value)}
            disabled={grupos.length === 0}
            style={{ padding: "8px 10px", border: `1px solid ${COLORS.neutro100}`, borderRadius: 8, fontSize: 13, color: COLORS.neutro900, background: "#fff" }}
          >
            {grupos.length === 0
              ? <option value="">Sin grupos</option>
              : grupos.map(grupo => <option key={grupo.id} value={grupo.id}>{grupo.nombre}</option>)}
          </select>
          <ActionButton label="Exportar a Excel" onClick={onExportar} disabled={!grupoSeleccionadoId || loading} />
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <Table
          columns={[
            {
              key: "nombre",
              header: "Estudiante",
              width: "220px",
              render: estudiante => (
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ color: COLORS.neutro900, fontWeight: 600 }}>{estudiante.nombreCompleto}</span>
                  <span style={{ color: COLORS.neutro500, fontSize: 12 }}>{estudiante.grupoNombre}</span>
                </div>
              ),
            },
            ...preguntas.map(pregunta => ({
              key: pregunta.id,
              header: pregunta.texto,
              width: "220px",
              render: (estudiante: FilaDatos) => (
                <span style={{ color: COLORS.neutro700, display: "block", whiteSpace: "normal" }}>
                  {estudiante.respuestas[pregunta.id] ?? "—"}
                </span>
              ),
            })),
          ]}
          data={estudiantes}
          getRowKey={estudiante => estudiante.estudianteId}
          emptyState={loading ? "Cargando respuestas..." : grupos.length === 0 ? "No hay grupos en esta evaluación." : "No hay respuestas registradas aún."}
          rowStyle={() => ({ borderTop: `1px solid ${COLORS.neutro50}` })}
        />
      </div>
    </div>
  );
}
