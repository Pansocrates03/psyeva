import { type ChangeEvent } from "react";
import Table from "../../components/Table";
import COLORS from "../../utils/Colors";
import ActionButton from "../ActionButton";

// ── Tipos ────────────────────────────────────────────────────
interface EstudianteGrupo {
  id: number;
  nombre: string;
  curp: string;
  reporte?: string;
  respuestas?: string[];
}


interface EstudianteTablaRow extends EstudianteGrupo {
  grupoNombre: string;
  grupoId: number;
  respuestas: string[];
}


export default function DetalleAnalisisDatos({
  estudiantes,
  onClose,
}: {
  estudiantes: EstudianteTablaRow[];
  onClose: () => void;
  onUploadReporte?: (grupoId: number, estudianteId: number, event: ChangeEvent<HTMLInputElement>) => void;
}) {
    const PREGUNTAS_DATA: string[] = [
        "Me desespero si los demás no entienden mi opinión.",
        "Inicio mi día pensando que me va ir muy bien.",
        "Cuando alguien me hace enojar, le pego inmediatamente.",
        "Cuando me estoy sintiendo mal por algún motivo, trato de pensar en cosas agradables para cambiar mis sentimientos.",
        "Si alguien me ofende, le guardo mucho rencor.",
        "Cuando me siento triste, hago algo para sentirme mejor (como por ejemplo, caminar, brincar, ver en la televisión algo bonito, platicar con mis padres, escribirlo en un papel y romperlo, llorar hasta sentirme mejor).",
        "Si me enojo estando con mis amigos me puedo controlar.",
        "Si estoy en una situación que está haciendo desagradable para mí, me retiro de ahí."
    ]

  return (
    <div style={{ marginTop: 24, background: "#fff", border: `1px solid ${COLORS.neutro100}`, borderRadius: 14, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: `1px solid ${COLORS.neutro100}` }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: COLORS.neutro900 }}>Respuestas por estudiante</h3>
          <div style={{ fontSize: 12, color: COLORS.neutro500, marginTop: 2 }}>{estudiantes.length} registros disponibles</div>
        </div>
        <ActionButton label="Exportar" onClick={() => {}} />
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
                  <span style={{ color: COLORS.neutro900, fontWeight: 600 }}>{estudiante.nombre}</span>
                  <span style={{ color: COLORS.neutro500, fontSize: 12 }}>{estudiante.grupoNombre}</span>
                </div>
              ),
            },
            ...PREGUNTAS_DATA.map((pregunta, index) => ({
              key: `pregunta${index + 1}`,
              header: pregunta,
              width: "220px",
              render: (estudiante: EstudianteTablaRow) => (
                <span style={{ color: COLORS.neutro700, display: "block", whiteSpace: "normal" }}>
                  {estudiante.respuestas?.[index] ?? "—"}
                </span>
              ),
            })),
          ]}
          data={estudiantes}
          getRowKey={estudiante => `${estudiante.grupoId}-${estudiante.id}`}
          emptyState="No hay respuestas registradas aún."
          rowStyle={() => ({ borderTop: `1px solid ${COLORS.neutro50}` })}
        />
      </div>
    </div>
  );
}