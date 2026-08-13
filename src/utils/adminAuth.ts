// Sesión del dashboard de administración. A propósito NO habla con el
// backend — usuario y contraseña fijos ("admin"/"admin"), guardados
// solo en localStorage. No es seguridad real, solo evita que cualquiera
// que abra el navegador caiga directo en /admin/*.
const AUTH_KEY = "psyeva.adminAuth";

export function iniciarSesionAdmin(usuario: string, contrasena: string): boolean {
  if (usuario.trim() === "admin" && contrasena === "admin") {
    localStorage.setItem(AUTH_KEY, "true");
    return true;
  }
  return false;
}

export function haySesionAdmin(): boolean {
  return localStorage.getItem(AUTH_KEY) === "true";
}

export function cerrarSesionAdmin() {
  localStorage.removeItem(AUTH_KEY);
}
