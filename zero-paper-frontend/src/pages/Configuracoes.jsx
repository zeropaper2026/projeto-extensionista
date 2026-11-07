// src/pages/Configuracoes.jsx
// Zero Paper – Configurações do administrador (A14)
// Funcionários · cadastro · troca de senha · permissão de estorno
// Integra com: GET/POST /funcionarios, PATCH /funcionarios/:id/senha, PATCH /funcionarios/:id/permissoes

import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../contexts/AuthContext";

// Mesma régua do backend (src/routes/funcionario.routes.js)
const MSG_SENHA = "A senha deve ter no mínimo 12 caracteres, com letras e números.";
const senhaForte = (s) => s.length >= 12 && s.length <= 72 && /[A-Za-z]/.test(s) && /\d/.test(s);
const msgErro = (err, padrao) => err.response?.data?.erro || padrao;

const INPUT =
  "w-full h-10 px-3 rounded-xl border border-gray-300 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-bios-primary-500 focus:bg-white transition";

export default function Configuracoes() {
  const { auth } = useAuth();
  // Guard extra: o menu já esconde o item e a API devolve 403 para quem não é admin
  if (auth?.funcionario?.papel !== "admin") return <Navigate to="/dashboard" replace />;
  return <Painel eu={auth.funcionario} />;
}

function Painel({ eu }) {
  const [funcionarios, setFuncionarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);
  const [toast, setToast] = useState(null);

  const [novo, setNovo] = useState({ nome: "", login: "", senha: "", papel: "atendente" });
  const [erroNovo, setErroNovo] = useState("");
  const [salvandoNovo, setSalvandoNovo] = useState(false);

  const [alvoSenha, setAlvoSenha] = useState(null); // funcionário com o formulário de senha aberto
  const [formSenha, setFormSenha] = useState({ atual: "", nova: "", confirma: "" });
  const [erroSenha, setErroSenha] = useState("");
  const [salvandoSenha, setSalvandoSenha] = useState(false);

  useEffect(() => {
    async function carregar() {
      try {
        const { data } = await api.get("/funcionarios");
        setFuncionarios(data);
      } catch (err) {
        setErro(msgErro(err, "Não foi possível carregar os funcionários."));
      } finally {
        setLoading(false);
      }
    }
    carregar();
  }, []);

  function mostrarToast(msg, tipo = "sucesso") {
    setToast({ msg, tipo });
    setTimeout(() => setToast(null), 3500);
  }

  async function cadastrar(e) {
    e.preventDefault();
    setErroNovo("");
    if (!novo.nome.trim()) return setErroNovo("Informe o nome.");
    if (!/^[A-Za-z0-9._-]{3,50}$/.test(novo.login.trim())) {
      return setErroNovo("Login: 3 a 50 caracteres (letras, números, ponto, hífen ou underline).");
    }
    if (!senhaForte(novo.senha)) return setErroNovo(MSG_SENHA);

    setSalvandoNovo(true);
    try {
      const { data } = await api.post("/funcionarios", {
        nome: novo.nome.trim(),
        login: novo.login.trim(),
        senha: novo.senha,
        papel: novo.papel,
      });
      setFuncionarios((lista) => [...lista, data].sort((a, b) => a.nome.localeCompare(b.nome)));
      setNovo({ nome: "", login: "", senha: "", papel: "atendente" });
      mostrarToast(`Funcionário ${data.nome} cadastrado.`);
    } catch (err) {
      setErroNovo(msgErro(err, "Erro ao cadastrar funcionário."));
    } finally {
      setSalvandoNovo(false);
    }
  }

  async function alternarEstorno(f) {
    try {
      const { data } = await api.patch(`/funcionarios/${f.id_funcionario}/permissoes`, {
        pode_estornar: !f.pode_estornar,
      });
      setFuncionarios((lista) => lista.map((x) => (x.id_funcionario === data.id_funcionario ? data : x)));
      mostrarToast(data.pode_estornar ? `${data.nome} pode estornar.` : `Estorno revogado para ${data.nome}.`);
    } catch (err) {
      mostrarToast(msgErro(err, "Erro ao atualizar permissão."), "erro");
    }
  }

  function abrirSenha(f) {
    setAlvoSenha(alvoSenha?.id_funcionario === f.id_funcionario ? null : f);
    setFormSenha({ atual: "", nova: "", confirma: "" });
    setErroSenha("");
  }

  async function trocarSenha(e) {
    e.preventDefault();
    setErroSenha("");
    const propria = alvoSenha.id_funcionario === eu.id;
    if (propria && !formSenha.atual) return setErroSenha("Informe a senha atual.");
    if (!senhaForte(formSenha.nova)) return setErroSenha(MSG_SENHA);
    if (formSenha.nova !== formSenha.confirma) return setErroSenha("A confirmação não confere com a nova senha.");

    setSalvandoSenha(true);
    try {
      await api.patch(`/funcionarios/${alvoSenha.id_funcionario}/senha`, {
        senha_atual: propria ? formSenha.atual : undefined,
        nova_senha: formSenha.nova,
      });
      mostrarToast(`Senha de ${alvoSenha.nome} alterada.`);
      setAlvoSenha(null);
    } catch (err) {
      setErroSenha(msgErro(err, "Erro ao trocar senha."));
    } finally {
      setSalvandoSenha(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium ${toast.tipo === "sucesso" ? "bg-green-600 text-white" : "bg-red-600 text-white"}`}>
          {toast.tipo === "sucesso" ? "✓ " : "✕ "}{toast.msg}
        </div>
      )}

      <div className="max-w-2xl mx-auto space-y-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Configurações</h1>
          <p className="text-sm text-gray-500">Funcionários, senhas e permissão de estorno.</p>
        </div>

        {/* ── Funcionários ───────────────────────────────────────── */}
        <section className="bg-white rounded-2xl border border-gray-200 p-5">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Funcionários</h2>

          {loading && <p className="text-sm text-gray-400">Carregando…</p>}
          {erro && <p className="text-sm text-red-600">{erro}</p>}

          <ul className="divide-y divide-gray-100">
            {funcionarios.map((f) => {
              const admin = f.papel === "admin";
              const aberto = alvoSenha?.id_funcionario === f.id_funcionario;
              return (
                <li key={f.id_funcionario} className="py-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex-1 min-w-[10rem]">
                      <p className="text-sm font-semibold text-gray-800">
                        {f.nome}{f.id_funcionario === eu.id && <span className="text-xs text-gray-400"> (você)</span>}
                      </p>
                      <p className="text-xs text-gray-400">
                        {f.login} · {admin ? "Administrador" : "Atendente"}
                      </p>
                    </div>

                    <label className={`flex items-center gap-2 text-xs ${admin ? "text-gray-400" : "text-gray-600 cursor-pointer"}`}>
                      <input
                        type="checkbox"
                        checked={admin || f.pode_estornar}
                        disabled={admin}
                        onChange={() => alternarEstorno(f)}
                        className="w-4 h-4 accent-bios-primary-600"
                      />
                      {admin ? "Estorna (sempre)" : "Pode estornar"}
                    </label>

                    <button
                      type="button"
                      onClick={() => abrirSenha(f)}
                      className="px-3 h-8 rounded-lg border border-gray-300 text-xs text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                      {aberto ? "Cancelar" : "Trocar senha"}
                    </button>
                  </div>

                  {aberto && (
                    <form onSubmit={trocarSenha} noValidate className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 bg-gray-50 rounded-xl p-3">
                      {f.id_funcionario === eu.id && (
                        <input type="password" autoComplete="current-password" placeholder="Senha atual" className={INPUT}
                          value={formSenha.atual} onChange={(e) => setFormSenha((s) => ({ ...s, atual: e.target.value }))} />
                      )}
                      <input type="password" autoComplete="new-password" placeholder="Nova senha" className={INPUT}
                        value={formSenha.nova} onChange={(e) => setFormSenha((s) => ({ ...s, nova: e.target.value }))} />
                      <input type="password" autoComplete="new-password" placeholder="Confirmar nova senha" className={INPUT}
                        value={formSenha.confirma} onChange={(e) => setFormSenha((s) => ({ ...s, confirma: e.target.value }))} />
                      <p className="sm:col-span-3 text-xs text-gray-400">{MSG_SENHA}</p>
                      {erroSenha && <p className="sm:col-span-3 text-xs text-red-500">{erroSenha}</p>}
                      <div className="sm:col-span-3 flex justify-end">
                        <button type="submit" disabled={salvandoSenha}
                          className="px-4 h-9 rounded-xl bg-bios-primary-600 text-white text-sm font-semibold hover:bg-bios-primary-700 disabled:opacity-50">
                          {salvandoSenha ? "Salvando…" : "Salvar nova senha"}
                        </button>
                      </div>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
          <p className="text-xs text-gray-400 mt-3">
            A permissão de estorno vale na hora no servidor; o botão “Estornar” aparece para o funcionário no próximo login.
          </p>
        </section>

        {/* ── Cadastrar funcionário ──────────────────────────────── */}
        <section className="bg-white rounded-2xl border border-gray-200 p-5">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Cadastrar funcionário</h2>
          <form onSubmit={cadastrar} noValidate className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1" htmlFor="fnome">Nome</label>
              <input id="fnome" className={INPUT} value={novo.nome} onChange={(e) => setNovo((n) => ({ ...n, nome: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1" htmlFor="flogin">Login</label>
              <input id="flogin" className={INPUT} placeholder="nome.sobrenome" autoComplete="off"
                value={novo.login} onChange={(e) => setNovo((n) => ({ ...n, login: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1" htmlFor="fsenha">Senha inicial</label>
              <input id="fsenha" type="password" className={INPUT} autoComplete="new-password"
                value={novo.senha} onChange={(e) => setNovo((n) => ({ ...n, senha: e.target.value }))} />
              <p className="text-xs text-gray-400 mt-1">{MSG_SENHA}</p>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1" htmlFor="fpapel">Papel</label>
              <select id="fpapel" className={INPUT} value={novo.papel} onChange={(e) => setNovo((n) => ({ ...n, papel: e.target.value }))}>
                <option value="atendente">Atendente</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
            {erroNovo && <p className="sm:col-span-2 text-xs text-red-500">{erroNovo}</p>}
            <div className="sm:col-span-2 flex justify-end">
              <button type="submit" disabled={salvandoNovo}
                className="px-5 h-10 rounded-xl bg-bios-primary-600 text-white text-sm font-semibold hover:bg-bios-primary-700 disabled:opacity-50">
                {salvandoNovo ? "Salvando…" : "Cadastrar funcionário"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
