// src/pages/CadastroCliente.jsx
// Zero Paper – Cadastro de Clientes
// Correções: props auth/onLogout removidas (vêm do Layout/AuthContext),
//            fetch → axios (api.js), CSS inline movido para <style> isolado

import { useState } from "react";
import api from "../services/api";

function formatCPF(value) {
  const d = value.replace(/\D/g, "").slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

function formatTel(value) {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 10) return d.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3");
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3");
}

export default function CadastroCliente() {
  const [form, setForm]       = useState({ nome: "", cpf: "", telefone: "", endereco: "", email: "" });
  const [errors, setErrors]   = useState({});
  const [loading, setLoading] = useState(false);
  const [sucesso, setSucesso] = useState(null);
  const [erroGeral, setErroGeral] = useState("");

  function validate() {
    const e = {};
    if (!form.nome.trim()) e.nome = "Nome é obrigatório.";
    const cpfLimpo = form.cpf.replace(/\D/g, "");
    if (!cpfLimpo) e.cpf = "CPF é obrigatório.";
    else if (cpfLimpo.length !== 11) e.cpf = "CPF deve ter 11 dígitos.";
    if (form.email && !/\S+@\S+\.\S+/.test(form.email)) e.email = "E-mail inválido.";
    return e;
  }

  function handleChange(field, value) {
    setErrors(prev => ({ ...prev, [field]: undefined }));
    setErroGeral("");
    if (field === "cpf")      value = formatCPF(value);
    if (field === "telefone") value = formatTel(value);
    setForm(f => ({ ...f, [field]: value }));
  }

  function handleNovo() {
    setForm({ nome: "", cpf: "", telefone: "", endereco: "", email: "" });
    setErrors({});
    setSucesso(null);
    setErroGeral("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errsVal = validate();
    if (Object.keys(errsVal).length) { setErrors(errsVal); return; }

    setLoading(true);
    setSucesso(null);
    setErroGeral("");

    try {
      const { data } = await api.post("/clientes", {
        nome:      form.nome.trim(),
        cpf:       form.cpf.replace(/\D/g, ""),
        telefone:  form.telefone || undefined,
        endereco:  form.endereco.trim() || undefined,
        email:     form.email.trim()    || undefined,
      });
      setSucesso(data);
    } catch (err) {
      const msg = err.response?.data?.erro
        || err.response?.data?.message
        || "Erro ao cadastrar cliente.";
      setErroGeral(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="zp-cc-wrap">
      <style>{`
        .zp-cc-wrap{display:flex;justify-content:center;align-items:center;min-height:calc(100vh - 76px);padding:2rem 1rem}
        .zp-cc-card{width:100%;max-width:600px;background:#fff;border-radius:16px;padding:2.5rem;border:1px solid #e2e8f0;box-shadow:0 4px 24px rgba(0,0,0,.06)}
        .zp-cc-head{margin-bottom:2rem}
        .zp-cc-head h1{font-family:'Sora',sans-serif;font-size:22px;font-weight:600;color:#0d2340;margin-bottom:4px}
        .zp-cc-head p{font-size:14px;color:#94a3b8}
        .zp-sec{font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-bottom:1rem}
        .zp-hr{border:none;border-top:1px solid #e2e8f0;margin:1.5rem 0}
        .zp-grid2{display:grid;grid-template-columns:1fr 1fr;gap:1.25rem}
        .zp-field{display:flex;flex-direction:column;gap:6px}
        .zp-label{font-size:13px;font-weight:500;color:#475569}
        .zp-req{color:#dc2626;font-size:11px}
        .zp-input{padding:11px 14px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:14px;font-family:'DM Sans',sans-serif;color:#0d2340;outline:none;transition:border-color .2s;background:#fff}
        .zp-input:focus{border-color:#1a7a6e}
        .zp-input.err{border-color:#dc2626;background:#fef2f2}
        .zp-ferr{font-size:12px;color:#dc2626}
        .zp-full{margin-top:1.25rem}
        .zp-actions{display:flex;gap:1rem;justify-content:flex-end;margin-top:2rem}
        .zp-btn-sec{padding:11px 24px;border-radius:8px;border:1.5px solid #e2e8f0;background:#fff;color:#475569;font-size:14px;font-family:'DM Sans',sans-serif;cursor:pointer;transition:.15s}
        .zp-btn-sec:hover{border-color:#1a7a6e;color:#1a7a6e}
        .zp-btn-pri{padding:11px 28px;border-radius:8px;background:#1a7a6e;color:#fff;border:none;font-size:14px;font-weight:600;font-family:'Sora',sans-serif;cursor:pointer;transition:.15s}
        .zp-btn-pri:hover:not(:disabled){background:#22a090}
        .zp-btn-pri:disabled{opacity:.55;cursor:not-allowed}
        .zp-alert{border-radius:8px;padding:12px 16px;font-size:14px;display:flex;align-items:flex-start;gap:10px;margin-top:1rem;line-height:1.5}
        .zp-alert.ok{background:#f0fdf4;border:1px solid #86efac;color:#15803d}
        .zp-alert.ko{background:#fef2f2;border:1px solid #fca5a5;color:#dc2626}
        .zp-alert strong{display:block;margin-bottom:3px;font-weight:600}
        @media(max-width:600px){.zp-grid2{grid-template-columns:1fr}.zp-cc-card{padding:1.5rem}}
      `}</style>

      <div className="zp-cc-card">
        <div className="zp-cc-head">
          <h1>Cadastrar novo cliente</h1>
          <p>Campos marcados com * são obrigatórios.</p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="zp-sec">Dados principais</div>
          <div className="zp-grid2">
            <div className="zp-field">
              <label className="zp-label">Nome completo <span className="zp-req">*</span></label>
              <input className={`zp-input${errors.nome ? " err" : ""}`}
                placeholder="Maria Oliveira" value={form.nome}
                onChange={e => handleChange("nome", e.target.value)} />
              {errors.nome && <span className="zp-ferr">{errors.nome}</span>}
            </div>
            <div className="zp-field">
              <label className="zp-label">CPF <span className="zp-req">*</span></label>
              <input className={`zp-input${errors.cpf ? " err" : ""}`}
                placeholder="000.000.000-00" value={form.cpf}
                onChange={e => handleChange("cpf", e.target.value)} inputMode="numeric" />
              {errors.cpf && <span className="zp-ferr">{errors.cpf}</span>}
            </div>
          </div>

          <hr className="zp-hr" />

          <div className="zp-sec">Contato</div>
          <div className="zp-grid2">
            <div className="zp-field">
              <label className="zp-label">Telefone</label>
              <input className="zp-input" placeholder="(63) 99999-0000"
                value={form.telefone}
                onChange={e => handleChange("telefone", e.target.value)} inputMode="tel" />
            </div>
            <div className="zp-field">
              <label className="zp-label">E-mail {errors.email && <span className="zp-req">✗</span>}</label>
              <input className={`zp-input${errors.email ? " err" : ""}`}
                placeholder="cliente@email.com" type="email" value={form.email}
                onChange={e => handleChange("email", e.target.value)} />
              {errors.email && <span className="zp-ferr">{errors.email}</span>}
            </div>
          </div>

          <div className="zp-full">
            <div className="zp-field">
              <label className="zp-label">Endereço</label>
              <input className="zp-input"
                placeholder="Rua das Palmeiras, 10 – Palmas/TO"
                value={form.endereco}
                onChange={e => handleChange("endereco", e.target.value)} />
            </div>
          </div>

          {erroGeral && (
            <div className="zp-alert ko">
              <span>⚠️</span>
              <div><strong>Erro ao cadastrar</strong>{erroGeral}</div>
            </div>
          )}

          {sucesso && (
            <div className="zp-alert ok">
              <span>✅</span>
              <div>
                <strong>Cliente cadastrado com sucesso!</strong>
                {sucesso.nome} salvo no banco (ID #{sucesso.id_cliente}).
              </div>
            </div>
          )}

          <div className="zp-actions">
            <button type="button" className="zp-btn-sec" onClick={handleNovo}>
              {sucesso ? "Novo cadastro" : "Limpar"}
            </button>
            <button type="submit" className="zp-btn-pri" disabled={loading || !!sucesso}>
              {loading ? "Salvando…" : "Salvar cliente"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
