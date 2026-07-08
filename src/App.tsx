import { BrowserRouter, Route, Routes } from "react-router-dom";
import "./index.css";

import MisAnalisis from "./pages/MisAnalisis";
import DetalleAnalisis from "./pages/DetalleAnalisis";
import Colegios from "./pages/Colegios";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MisAnalisis />} />
        <Route path="/analisis" element={<DetalleAnalisis />} />
        <Route path="/colegios" element={<Colegios />} />
        <Route path="/escuelas" element={<Colegios />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
