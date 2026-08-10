// Se carga una sola vez para todo `bun test` (ver bunfig.toml → [test].preload),
// a diferencia de tests/setup.ts que cada archivo de test importa por su cuenta.
// Su único trabajo: dejar la BD en el estado limpio de db/reset-and-seed.sql
// al terminar toda la suite, para no tener que resetearla a mano después.
import { afterAll } from "bun:test";
import path from "node:path";
import sql from "../src/db";

const RESET_SQL_PATH = path.resolve(import.meta.dir, "../db/reset-and-seed.sql");

afterAll(async () => {
  await sql.file(RESET_SQL_PATH);
  await sql.end();
});
