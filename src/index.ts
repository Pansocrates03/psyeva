import { serve } from "bun";
import index from "./index.html";

import {
  // Admin
  analisisRoutes,
  analisisIdRoutes,
  //analisisExportarRoutes,
  //gruposIdRoutes,
  //reportesRoutes,
  //reportesPublicarRoutes,
  // Facilitador
  //verificarRoutes,
  //facilitadorGruposRoutes,
  //estudiantesRoutes,
  //sesionesRoutes,
  //facilitadorReportesRoutes,
} from "./routes";

const server = serve({
  routes: {
    "/*": index,

    // ── Admin ───────────────────────────────────────────────
    "/api/admin/analisis":              analisisRoutes,
    "/api/admin/analisis/:id":          analisisIdRoutes,
    //"/api/admin/analisis/:id/exportar": analisisExportarRoutes,
    //"/api/admin/grupos/:id":            gruposIdRoutes,
    //"/api/admin/reportes":              reportesRoutes,
    //"/api/admin/reportes/:id/publicar": reportesPublicarRoutes,

    // ── Facilitador ─────────────────────────────────────────
    //"/api/facilitador/verificar":            verificarRoutes,
    //"/api/facilitador/grupos":               facilitadorGruposRoutes,
    //"/api/facilitador/estudiantes/:grupoId": estudiantesRoutes,
    //"/api/facilitador/sesiones":             sesionesRoutes,
    //"/api/facilitador/reportes":             facilitadorReportesRoutes,
  },

  development: process.env.NODE_ENV !== "production" && {
    hmr: true,
    console: true,
  },
});

console.log(`🚀 Server running at ${server.url}`);