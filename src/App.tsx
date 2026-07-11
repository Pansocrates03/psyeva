import { BrowserRouter, Route, Routes } from "react-router-dom";
import "./index.css";

import MisAnalisis from "./pages/MisAnalisis";
import DetalleAnalisis from "./pages/DetalleAnalisis";
import Colegios from "./pages/Colegios";
import EncuestasBase from "./pages/EncuestasBase";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MisAnalisis />} />
        <Route path="/analisis" element={<DetalleAnalisis />} />
        <Route path="/colegios" element={<Colegios />} />
        <Route path="/escuelas" element={<Colegios />} />
        <Route path="/encuestas" element={<EncuestasBase />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
