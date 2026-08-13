import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { haySesionAdmin } from "../utils/adminAuth";

// Envuelve las rutas /admin/* — sin sesión, manda al login.
export default function RequireAdmin({ children }: { children: ReactNode }) {
  if (!haySesionAdmin()) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}
