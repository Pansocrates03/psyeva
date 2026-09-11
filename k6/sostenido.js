// Prueba SOSTENIDA: 500 alumnos independientes navegando la encuesta a
// su propio ritmo durante ~10 minutos — no 500 clicks sincronizados
// (eso es pico.js), sino 500 recorridos completos con pausas random,
// arrancando escalonados en el primer minuto (como en la vida real, no
// todos entran al link exacto en el mismo segundo).
//
// Esto mide algo distinto de pico.js: fugas de conexiones del pool,
// memoria del proceso creciendo con el tiempo, si el autovacuum de
// Postgres da abasto con el volumen sostenido de UPDATE/INSERT — cosas
// que un pico de segundos no alcanza a mostrar.
//
// Requiere haber corrido antes: bun run seed:carga
//
// Uso:
//   k6 run k6/sostenido.js
//   k6 run -e BASE_URL=https://tu-app.up.railway.app k6/sostenido.js
//
// OJO: a diferencia de pico.js, esto SÍ completa la sesión de cada
// alumno — hay que correr `bun run seed:carga` de nuevo antes de repetir
// esta prueba (si no, iniciar_sesion rechaza con sesion_ya_completada
// porque ya la completaron la corrida anterior).
import { sleep } from "k6";
import { simularAlumno } from "./flujo.js";

const data = JSON.parse(open("./carga-data.json"));
const BASE_URL = __ENV.BASE_URL || data.baseUrl;

export const options = {
  scenarios: {
    sostenido_10min: {
      executor: "per-vu-iterations",
      vus: data.estudianteIds.length,
      iterations: 1,
      maxDuration: "12m", // margen sobre los ~10 min que puede tardar un recorrido completo
    },
  },
  thresholds: {
    http_req_failed:   ["rate<0.01"],
    http_req_duration: ["p(95)<3000"],
  },
};

export default function () {
  // Arranque escalonado en el primer minuto, no los 500 a la vez.
  sleep(Math.random() * 60);

  const estudianteId = data.estudianteIds[__VU - 1];

  // ~10 preguntas por alumno, 20-60s de "pensar" entre cada una → un
  // recorrido completo tarda entre ~3 y ~10 minutos, repartiendo a los
  // 500 alumnos a lo largo de toda la ventana de la prueba.
  simularAlumno(BASE_URL, estudianteId, data.formularioId, data.evaluacionId, {
    pensarEntrePreguntas: true,
    pausaMin: 20,
    pausaMax: 60,
  });
}
