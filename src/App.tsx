import { BrowserRouter, Route, Routes } from "react-router-dom";
import "./index.css";

import MisAnalisis from "./pages/MisAnalisis";
import DetalleAnalisis from "./pages/DetalleAnalisis";
import Colegios from "./pages/Colegios";
import EncuestasBase from "./pages/EncuestasBase";
import WIP from "./pages/WIP";
import Reactivo from "./pages/Reactivo";
import Encuesta from "./pages/Encuesta";
import Login from "./pages/Login";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/admin/evaluaciones" element={<MisAnalisis />} />
        <Route path="/admin/evaluaciones/:id" element={<DetalleAnalisis />} />
        <Route path="/admin/colegios" element={<Colegios />} />
        <Route path="/admin/escuelas" element={<Colegios />} />
        <Route path="/admin/encuestas" element={<EncuestasBase />} />
        <Route path="/configuracion" element={<WIP />} />
        <Route path="/test-encuesta" element={<Encuesta />} />
        <Route path="/test-reactivo" element={<Reactivo pregunta="¿Cuál es la capital de Francia?" opciones={[{"label": "Madrid", "value": 1}, {"label": "París", "value": 2}, {"label": "Berlín", "value": 3}]} numeroPregunta={1}
          totalPreguntas={3} />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
