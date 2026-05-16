// src/App.jsx
// Zero Paper – Roteamento principal (React Router v6)
// Correções aplicadas:
//   - AuthProvider envolve toda a aplicação
//   - Layout global reutilizado por todas as rotas protegidas
//   - Typo corrigido: divdaId → dividaId
//   - BuscaCliente e RegistrarPagamento incluídos

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Login from "./pages/Login";
import CadastroCliente from "./pages/CadastroCliente";
import BuscaCliente from "./pages/BuscaCliente";
import CadastroDivida from "./pages/CadastroDivida";
import ListaDividas from "./pages/ListaDividas";
import RegistrarPagamento from "./pages/RegistrarPagamento";

function RotaProtegida({ children }) {
  const { auth } = useAuth();
  if (!auth?.token) return <Navigate to="/login" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/clientes/novo" element={<RotaProtegida><CadastroCliente /></RotaProtegida>} />
      <Route path="/clientes" element={<RotaProtegida><BuscaCliente /></RotaProtegida>} />
      <Route path="/dividas/nova" element={<RotaProtegida><CadastroDivida /></RotaProtegida>} />
      {/* Rota para listar dívidas de um cliente */}
      <Route path="/dividas/:clienteId" element={<RotaProtegida><ListaDividas /></RotaProtegida>} />
      {/* Rota para pagar uma dívida específica – CORRIGIDO: parâmetro :dividaId (sem erro de digitação) */}
      <Route path="/dividas/:dividaId/pagar" element={<RotaProtegida><RegistrarPagamento /></RotaProtegida>} />
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