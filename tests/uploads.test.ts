import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createTestServer } from "./setup";
import { uploadsRoutes } from "../src/routes";

let server: ReturnType<typeof createTestServer>;
let uploadsDir: string;

beforeAll(async () => {
  uploadsDir = await mkdtemp(path.join(tmpdir(), "psyeva-uploads-test-"));
  process.env.UPLOADS_DIR = uploadsDir;
  await Bun.write(path.join(uploadsDir, "reporte-test.pdf"), new Uint8Array([0x25, 0x50, 0x44, 0x46]));
  server = createTestServer({ "/uploads/:filename": uploadsRoutes });
});
afterAll(async () => {
  server.stop();
  delete process.env.UPLOADS_DIR;
  await rm(uploadsDir, { recursive: true, force: true });
});

describe("GET /uploads/:filename", () => {
  test("200 y devuelve el contenido real del archivo (no el index.html del SPA)", async () => {
    const res = await fetch(`${server.url}/uploads/reporte-test.pdf`);
    expect(res.status).toBe(200);

    const buffer = new Uint8Array(await res.arrayBuffer());
    expect(buffer[0]).toBe(0x25); // "%PDF" — no es el HTML del SPA
  });

  test("404 si el archivo no existe", async () => {
    const res = await fetch(`${server.url}/uploads/no-existe.pdf`);
    expect(res.status).toBe(404);
  });

  test("404 si el nombre intenta salirse del directorio de uploads", async () => {
    const res = await fetch(`${server.url}/uploads/..%2f..%2fdb%2freset-and-seed.sql`);
    expect(res.status).toBe(404);
  });
});
