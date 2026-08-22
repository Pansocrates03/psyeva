import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { createTestServer } from "../setup";
import {
  adminAuthRoutes,
  adminLogoutRoutes,
  adminSesionRoutes,
  withAdminAuth,
} from "../../src/routes";

let server: ReturnType<typeof createTestServer>;

const protectedRoutes = withAdminAuth({
  GET: async () => Response.json({ data: { protegido: true } }),
});

beforeAll(() => {
  process.env.ADMIN_PASSWORD = "admin";
  server = createTestServer({
    "/api/admin/login": adminAuthRoutes,
    "/api/admin/sesion": adminSesionRoutes,
    "/api/admin/logout": adminLogoutRoutes,
    "/api/admin/protegido": protectedRoutes,
  });
});

afterAll(() => server.stop());

function postLogin(password: string) {
  return fetch(`${server.url}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
}

function cookieFrom(response: Response): string {
  return response.headers.get("set-cookie")?.split(";", 1)[0] ?? "";
}

describe("autenticación de administrador", () => {
  test("rechaza el acceso a una ruta protegida sin sesión", async () => {
    const response = await fetch(`${server.url}/api/admin/protegido`);

    expect(response.status).toBe(401);
  });

  test("rechaza una contraseña incorrecta", async () => {
    const response = await postLogin("incorrecta");

    expect(response.status).toBe(401);
  });

  test("crea una sesión con la contraseña configurada", async () => {
    const loginResponse = await postLogin("admin");
    const cookie = cookieFrom(loginResponse);

    expect(loginResponse.status).toBe(200);
    expect(cookie).toMatch(/^psyeva_admin_session=.+/);

    const sessionResponse = await fetch(`${server.url}/api/admin/sesion`, {
      headers: { Cookie: cookie },
    });
    expect(sessionResponse.status).toBe(200);
    expect((await sessionResponse.json()).data.autenticado).toBe(true);
  });

  test("permite la ruta protegida con una sesión válida", async () => {
    const cookie = cookieFrom(await postLogin("admin"));
    const response = await fetch(`${server.url}/api/admin/protegido`, {
      headers: { Cookie: cookie },
    });

    expect(response.status).toBe(200);
    expect((await response.json()).data.protegido).toBe(true);
  });

  test("invalida la sesión al cerrar sesión", async () => {
    const cookie = cookieFrom(await postLogin("admin"));
    const logoutResponse = await fetch(`${server.url}/api/admin/logout`, {
      method: "POST",
      headers: { Cookie: cookie },
    });

    expect(logoutResponse.status).toBe(200);
    const sessionResponse = await fetch(`${server.url}/api/admin/sesion`, {
      headers: { Cookie: cookie },
    });
    expect((await sessionResponse.json()).data.autenticado).toBe(false);
  });
});
