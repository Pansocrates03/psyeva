import { BrowserRouter, Route, Routes } from "react-router-dom";
import "./index.css";

import MisAnalisis from "./pages/MisAnalisis";
import DetalleAnalisis from "./pages/DetalleAnalisis";
import Colegios from "./pages/Colegios";
import EncuestasBase from "./pages/EncuestasBase";
import WIP from "./pages/WIP";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<WIP />} />
        <Route path="/analisis" element={<MisAnalisis />} />
        <Route path="/analisis/:id" element={<DetalleAnalisis />} />
        <Route path="/colegios" element={<Colegios />} />
        <Route path="/escuelas" element={<Colegios />} />
        <Route path="/encuestas" element={<EncuestasBase />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
