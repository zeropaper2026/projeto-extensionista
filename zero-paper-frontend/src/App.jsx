import { useState } from "react";
import Login from "./pages/Login";
import CadastroCliente from "./pages/CadastroCliente";

export default function App() {
  const [page, setPage] = useState("login");
  const [auth, setAuth] = useState(null); // { token, funcionario }

  function handleLoginSuccess(data) {
    setAuth(data);
    setPage("cadastro"); // MVP: login vai direto para cadastro
  }

  function handleLogout() {
    setAuth(null);
    setPage("login");
  }

  if (page === "login") return <Login onSuccess={handleLoginSuccess} />;
  return <CadastroCliente auth={auth} onLogout={handleLogout} />;
}
