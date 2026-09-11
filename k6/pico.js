// Prueba de PICO: simula el instante exacto en que 500 alumnos, cada uno
// ya en medio de su propia encuesta, tocan "Siguiente" al mismo tiempo.
// Todos responden la misma pregunta (la primera del formulario de carga,
// preparada por scripts/seed-carga.ts) para que el pico caiga
// literalmente en el mismo instante — es la interpretación más literal
// de "recibir hasta 500 clicks al mismo tiempo".
//
// Requiere haber corrido antes: bun run seed:carga
//
// Uso:
//   k6 run k6/pico.js
//   k6 run -e BASE_URL=https://tu-app.up.railway.app k6/pico.js   # contra Railway
//
// Es repetible sin volver a sembrar: guardar_respuesta hace upsert sobre
// la misma pregunta, así que correrlo de nuevo no rompe nada.
import http from "k6/http";
import { check } from "k6";

const data = JSON.parse(open("./carga-data.json"));
const BASE_URL = __ENV.BASE_URL || data.baseUrl;
const HEADERS = { headers: { "Content-Type": "application/json" } };

export const options = {
  scenarios: {
    pico_500_clicks: {
      executor: "per-vu-iterations",
      vus: data.sesiones.length,
      iterations: 1,
      maxDuration: "30s",
    },
  },
  thresholds: {
    http_req_failed:   ["rate<0.01"],
    http_req_duration: ["p(95)<3000"],
  },
};

export default function () {
  const sesion = data.sesiones[__VU - 1];
  const opciones = data.primeraPregunta.opciones;
  const elegida = opciones[Math.floor(Math.random() * opciones.length)];

  const res = http.post(
    `${BASE_URL}/api/facilitador/sesiones/respuesta`,
    JSON.stringify({
      sesionId:    sesion.sesionId,
      preguntaId:  data.primeraPregunta.id,
      textoLibre:  elegida.texto,
    }),
    HEADERS
  );

  check(res, { "guardar respuesta: 201": r => r.status === 201 });
}
