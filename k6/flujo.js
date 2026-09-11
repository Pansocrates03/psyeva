// Lógica compartida entre pico.js y sostenido.js: el recorrido real de
// UN alumno respondiendo una encuesta — iniciar (o retomar) la sesión,
// responder cada pregunta pendiente (con pausa opcional entre cada una)
// y completar al final. Mismos endpoints que usa Encuesta.tsx.
import http from "k6/http";
import { check, sleep } from "k6";

const HEADERS = { headers: { "Content-Type": "application/json" } };

export function simularAlumno(baseUrl, estudianteId, formularioId, evaluacionId, opts = {}) {
  const { pensarEntrePreguntas = false, pausaMin = 1, pausaMax = 1 } = opts;

  const iniciarRes = http.post(
    `${baseUrl}/api/facilitador/sesiones`,
    JSON.stringify({ estudianteId, formularioId, evaluacionId }),
    HEADERS
  );

  const iniciarOk = check(iniciarRes, {
    "iniciar sesión: 200/201": r => r.status === 200 || r.status === 201,
  });
  if (!iniciarOk) return;

  const body = iniciarRes.json("data");
  const sesionId = body.sesion.sesionId;
  const pendientes = body.preguntas.filter(p => !p.textoLibre);

  for (const pregunta of pendientes) {
    if (pensarEntrePreguntas) {
      sleep(pausaMin + Math.random() * (pausaMax - pausaMin));
    }

    const opciones = pregunta.opcionesRespuesta;
    const elegida = opciones[Math.floor(Math.random() * opciones.length)];

    const respuestaRes = http.post(
      `${baseUrl}/api/facilitador/sesiones/respuesta`,
      JSON.stringify({ sesionId, preguntaId: pregunta.id, textoLibre: elegida.texto }),
      HEADERS
    );

    check(respuestaRes, { "guardar respuesta: 201": r => r.status === 201 });
  }

  const completarRes = http.patch(
    `${baseUrl}/api/facilitador/sesiones/completar`,
    JSON.stringify({ sesionId }),
    HEADERS
  );

  check(completarRes, { "completar sesión: 200": r => r.status === 200 });
}
