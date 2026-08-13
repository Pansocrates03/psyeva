import { BrowserRouter, Route, Routes } from "react-router-dom";
import "./index.css";

import MisAnalisis from "./pages/MisAnalisis";
import DetalleAnalisis from "./pages/DetalleAnalisis";
import Colegios from "./pages/Colegios";
import EncuestasBase from "./pages/EncuestasBase";
import WIP from "./pages/WIP";
import Reactivo from "./pages/Reactivo";
import Encuesta from "./pages/Encuesta";
import Reportes from "./pages/Reportes";
import Login from "./pages/Login";
import RequireAdmin from "./components/RequireAdmin";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/admin/evaluaciones" element={<RequireAdmin><MisAnalisis /></RequireAdmin>} />
        <Route path="/admin/evaluaciones/:id" element={<RequireAdmin><DetalleAnalisis /></RequireAdmin>} />
        <Route path="/admin/colegios" element={<RequireAdmin><Colegios /></RequireAdmin>} />
        <Route path="/admin/escuelas" element={<RequireAdmin><Colegios /></RequireAdmin>} />
        <Route path="/admin/encuestas" element={<RequireAdmin><EncuestasBase /></RequireAdmin>} />
        <Route path="/admin/configuracion" element={<RequireAdmin><WIP /></RequireAdmin>} />
        <Route path="/test-encuesta" element={<Encuesta />} />
        <Route path="/evaluacion/:id" element={<Encuesta />} />
        <Route path="/reportes/:id" element={<Reportes />} />
        <Route path="/test-reactivo" element={<Reactivo pregunta="¿Cuál es la capital de Francia?" opciones={[{"label": "Madrid", "value": 1}, {"label": "París", "value": 2}, {"label": "Berlín", "value": 3}]} numeroPregunta={1}
          totalPreguntas={3} />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
