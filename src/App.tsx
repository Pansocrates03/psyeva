import { useEffect, useState, type ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import "./index.css";
import { databaseService } from "./services/databaseService";

import MisAnalisis from "./pages/MisAnalisis";
import DetalleAnalisis from "./pages/DetalleAnalisis";
import Colegios from "./pages/Colegios";
import EncuestasBase from "./pages/EncuestasBase";
import WIP from "./pages/WIP";
import Reactivo from "./pages/Reactivo";
import Encuesta from "./pages/Encuesta";
import Reportes from "./pages/Reportes";
import Login from "./pages/Login";

function AdminGuard({ children }: { children: ReactNode }) {
  const [checking, setChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    let mounted = true;
    databaseService.admin.verificarSesion()
      .then((hasSession) => {
        if (mounted) {
          setAuthenticated(hasSession);
          setChecking(false);
        }
      })
      .catch(() => {
        if (mounted) setChecking(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  if (checking) return null;
  return authenticated ? children : <Navigate to="/" replace />;
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/admin/evaluaciones" element={<AdminGuard><MisAnalisis /></AdminGuard>} />
        <Route path="/admin/evaluaciones/:id" element={<AdminGuard><DetalleAnalisis /></AdminGuard>} />
        <Route path="/admin/colegios" element={<AdminGuard><Colegios /></AdminGuard>} />
        <Route path="/admin/escuelas" element={<AdminGuard><Colegios /></AdminGuard>} />
        <Route path="/admin/encuestas" element={<AdminGuard><EncuestasBase /></AdminGuard>} />
        <Route path="/admin/configuracion" element={<AdminGuard><WIP /></AdminGuard>} />
        <Route path="/evaluacion/:id" element={<Encuesta />} />
        <Route path="/reportes/:id" element={<Reportes />} />
  
      </Routes>
    </BrowserRouter>
  );
}

export default App;
