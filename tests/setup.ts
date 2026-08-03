import path from "node:path";
import sql from "../src/db";

// Reusa la conexión de la app (src/db.ts) para los tests.
export { sql };

const RESET_SQL_PATH = path.resolve(import.meta.dir, "../db/reset-and-seed.sql");

// Trunca todas las tablas y vuelve a cargar db/reset-and-seed.sql.
// Se llama en beforeEach de cada suite para partir de un estado conocido
// (ver tests/factories.ts para los ids fijos que inserta ese script).
export async function resetDb() {
  await sql.file(RESET_SQL_PATH);
}

// Levanta un servidor Bun real en un puerto libre con el subconjunto de
// rutas que necesite la suite, para poder probar con fetch() como un
// cliente HTTP real (matching de :params, headers, status codes, etc.)
export function createTestServer(routes: Record<string, unknown>) {
  const server = Bun.serve({ port: 0, routes: routes as never });
  return {
    url: server.url.toString().replace(/\/$/, ""),
    stop: () => server.stop(true),
  };
}
