import { serve } from "bun";
import index from "./index.html";

import {
  // Admin
  colegiosRoutes,
  colegiosIdRoutes,
  formulariosRoutes,
  formulariosIdRoutes,
  evaluacionRoutes,
  evaluacionIdRoutes,
  evaluacionExportarRoutes,
  evaluacionEstadoRoutes,
  gruposRoutes,
  gruposIdRoutes,
  gruposEstudiantesRoutes,
  gruposEstudiantesImportarRoutes,
  plantillasEstudiantesRoutes,
  gruposRespuestasRoutes,
  estudiantesIdRoutes,
  reportesRoutes,
  // Archivos
  uploadsRoutes,
  // Facilitador
  verificarRoutes,
  facilitadorEvaluacionIdRoutes,
  facilitadorEvaluacionVerificarRoutes,
  facilitadorGruposRoutes,
  estudiantesRoutes,
  sesionesRoutes,
  facilitadorReportesRoutes,
} from "./routes";

const server = serve({
  routes: {
    "/*": index,

    // ── Admin ───────────────────────────────────────────────
    "/api/admin/colegios":                      colegiosRoutes,
    "/api/admin/colegios/:id":                  colegiosIdRoutes,
    "/api/admin/formularios":                   formulariosRoutes,
    "/api/admin/formularios/:id":                formulariosIdRoutes,
    "/api/admin/evaluaciones":                  evaluacionRoutes,
    "/api/admin/evaluaciones/:id":              evaluacionIdRoutes,
    "/api/admin/evaluaciones/:id/exportar":     evaluacionExportarRoutes,
    "/api/admin/evaluaciones/:id/estado":       evaluacionEstadoRoutes,
    "/api/admin/grupos":                        gruposRoutes,
    "/api/admin/grupos/:id":                    gruposIdRoutes,
    "/api/admin/grupos/:id/estudiantes":         gruposEstudiantesRoutes,
    "/api/admin/grupos/:id/estudiantes/importar": gruposEstudiantesImportarRoutes,
    "/api/admin/grupos/:id/respuestas":          gruposRespuestasRoutes,
    "/api/admin/estudiantes/:id":                estudiantesIdRoutes,
    "/api/admin/plantillas/estudiantes":          plantillasEstudiantesRoutes,
    "/api/admin/reportes":                      reportesRoutes,

    // ── Archivos subidos ──────────────────────────────────────
    "/uploads/:filename":                       uploadsRoutes,

    // ── Facilitador ─────────────────────────────────────────
    "/api/facilitador/verificar":                    verificarRoutes,
    "/api/facilitador/evaluaciones/:id":             facilitadorEvaluacionIdRoutes,
    "/api/facilitador/evaluaciones/:id/verificar":   facilitadorEvaluacionVerificarRoutes,
    "/api/facilitador/grupos":                       facilitadorGruposRoutes,
    "/api/facilitador/estudiantes/:grupoId":         estudiantesRoutes,
    "/api/facilitador/sesiones":                     sesionesRoutes,
    "/api/facilitador/sesiones/respuesta":           sesionesRoutes,
    "/api/facilitador/sesiones/completar":           sesionesRoutes,
    "/api/facilitador/reportes":                     facilitadorReportesRoutes,
  },

  development: process.env.NODE_ENV !== "production" && {
    hmr: true,
    console: true,
  },
});

console.log(`🚀 Server running at ${server.url}`);