const ADMIN_SESSION_COOKIE = "psyeva_admin_session";
const ADMIN_SESSION_MAX_AGE = 60 * 60 * 8;
const adminSessions = new Set<string>();

type AdminRouteHandler = (request: Request) => Response | Promise<Response>;
type AdminRoutes = Record<string, AdminRouteHandler>;

function getSessionToken(request: Request): string | null {
  const cookieHeader = request.headers.get("Cookie") ?? "";
  const sessionCookie = cookieHeader
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${ADMIN_SESSION_COOKIE}=`));

  return sessionCookie?.slice(ADMIN_SESSION_COOKIE.length + 1) || null;
}

function hasAdminSession(request: Request): boolean {
  const token = getSessionToken(request);
  return token !== null && adminSessions.has(token);
}

function sessionCookie(token: string): string {
  return `${ADMIN_SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${ADMIN_SESSION_MAX_AGE}`;
}

export const adminAuthRoutes = {
  async POST(request: Request) {
    try {
      const body = await request.json();
      const password = body?.password;
      const configuredPassword = process.env.ADMIN_PASSWORD;

      if (!configuredPassword || typeof password !== "string" || password !== configuredPassword) {
        return Response.json({ error: "Contraseña incorrecta" }, { status: 401 });
      }

      const token = crypto.randomUUID();
      adminSessions.add(token);

      return Response.json(
        { data: { autenticado: true } },
        { headers: { "Set-Cookie": sessionCookie(token) } }
      );
    } catch (error) {
      console.error("[POST /api/admin/login]", error);
      return Response.json({ error: "Solicitud inválida" }, { status: 400 });
    }
  },
};

export const adminSesionRoutes = {
  async GET(request: Request) {
    return Response.json({ data: { autenticado: hasAdminSession(request) } });
  },
};

export const adminLogoutRoutes = {
  async POST(request: Request) {
    const token = getSessionToken(request);
    if (token) adminSessions.delete(token);

    return Response.json(
      { data: { autenticado: false } },
      { headers: { "Set-Cookie": `${ADMIN_SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0` } }
    );
  },
};

export function withAdminAuth(routes: AdminRoutes): AdminRoutes {
  return Object.fromEntries(
    Object.entries(routes).map(([method, handler]) => [
      method,
      async (request: Request) => {
        if (!hasAdminSession(request)) {
          return Response.json({ error: "Se requiere iniciar sesión como administrador" }, { status: 401 });
        }
        return handler(request);
      },
    ])
  );
}