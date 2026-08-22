import { serve } from "bun";
import index from "./index.html";

import {
  // Admin
  adminAuthRoutes,
  adminLogoutRoutes,
  adminSesionRoutes,
  withAdminAuth,
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
  imagenesRoutes,
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
    "/api/admin/login":                         adminAuthRoutes,
    "/api/admin/sesion":                        adminSesionRoutes,
    "/api/admin/logout":                        adminLogoutRoutes,
    "/api/admin/colegios":                      withAdminAuth(colegiosRoutes),
    "/api/admin/colegios/:id":                  withAdminAuth(colegiosIdRoutes),
    "/api/admin/formularios":                   withAdminAuth(formulariosRoutes),
    "/api/admin/formularios/:id":               withAdminAuth(formulariosIdRoutes),
    "/api/admin/evaluaciones":                  withAdminAuth(evaluacionRoutes),
    "/api/admin/evaluaciones/:id":              withAdminAuth(evaluacionIdRoutes),
    "/api/admin/evaluaciones/:id/exportar":     withAdminAuth(evaluacionExportarRoutes),
    "/api/admin/evaluaciones/:id/estado":       withAdminAuth(evaluacionEstadoRoutes),
    "/api/admin/grupos":                        withAdminAuth(gruposRoutes),
    "/api/admin/grupos/:id":                    withAdminAuth(gruposIdRoutes),
    "/api/admin/grupos/:id/estudiantes":        withAdminAuth(gruposEstudiantesRoutes),
    "/api/admin/grupos/:id/estudiantes/importar": withAdminAuth(gruposEstudiantesImportarRoutes),
    "/api/admin/grupos/:id/respuestas":         withAdminAuth(gruposRespuestasRoutes),
    "/api/admin/estudiantes/:id":               withAdminAuth(estudiantesIdRoutes),
    "/api/admin/plantillas/estudiantes":        withAdminAuth(plantillasEstudiantesRoutes),
    "/api/admin/reportes":                      withAdminAuth(reportesRoutes),
    "/api/admin/imagenes":                      withAdminAuth(imagenesRoutes),

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