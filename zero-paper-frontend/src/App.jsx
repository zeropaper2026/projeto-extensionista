// src/App.jsx
// Zero Paper – Roteamento principal (React Router v6)

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import CadastroCliente from "./pages/CadastroCliente";
import BuscaCliente from "./pages/BuscaCliente";
import CadastroDivida from "./pages/CadastroDivida";
import ListaDividas from "./pages/ListaDividas";
import RegistrarPagamento from "./pages/RegistrarPagamento";

function AppRoutes() {
  return (
    <Routes>
      {/* Rota pública */}
      <Route path="/login" element={<Login />} />

      {/* Rotas protegidas — Layout já contém o guard de autenticação */}
      <Route path="/clientes/novo"          element={<Layout><CadastroCliente /></Layout>} />
      <Route path="/clientes"               element={<Layout><BuscaCliente /></Layout>} />
      <Route path="/dividas/nova"           element={<Layout><CadastroDivida /></Layout>} />
      <Route path="/dividas/:clienteId"     element={<Layout><ListaDividas /></Layout>} />
      <Route path="/dividas/:dividaId/pagar" element={<Layout><RegistrarPagamento /></Layout>} />

      <Route path="*" element={<Navigate to="/clientes" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
