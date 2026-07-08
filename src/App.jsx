import { Routes, Route } from "react-router-dom";
import ConfiguracionAdmin from "./pages/ConfiguracionAdmin";
import Home from "./pages/Home";
import Remates from "./pages/Remates";
import DetalleRemate from "./pages/DetalleRemate";
import NuevoRemate from "./pages/NuevoRemate";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/remates" element={<Remates />} />
      <Route path="/remate/:id" element={<DetalleRemate />} />
      <Route path="/nuevo" element={<NuevoRemate />} />
      <Route path="/editar/:id" element={<NuevoRemate />} />
      <Route path="/configuracion" element={<ConfiguracionAdmin />} />
    </Routes>
  );
}

export default App;