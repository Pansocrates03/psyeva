import { serve } from "bun";
import index from "./index.html";

import {
  // Admin
  colegiosRoutes,
  evaluacionRoutes,
  evaluacionIdRoutes,
  evaluacionExportarRoutes,
  evaluacionEstadoRoutes,
  gruposIdRoutes,
  reportesRoutes,
  // Facilitador
  verificarRoutes,
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
    "/api/admin/evaluaciones":                  evaluacionRoutes,
    "/api/admin/evaluaciones/:id":              evaluacionIdRoutes,
    "/api/admin/evaluaciones/:id/exportar":     evaluacionExportarRoutes,
    "/api/admin/evaluaciones/:id/estado":       evaluacionEstadoRoutes,
    "/api/admin/grupos/:id":                    gruposIdRoutes,
    "/api/admin/reportes":                      reportesRoutes,

    // ── Facilitador ─────────────────────────────────────────
    "/api/facilitador/verificar":                    verificarRoutes,
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