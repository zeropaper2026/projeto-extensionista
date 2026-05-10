import { useState } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:3333";

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

export default function CadastroCliente({ auth, onLogout }) {
  const [form, setForm] = useState({ nome: "", cpf: "", telefone: "", endereco: "", email: "" });
  const [errors, setErrors] = useState({});
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
    if (field === "cpf") value = formatCPF(value);
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
      const res = await fetch(`${API}/clientes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify({
          nome: form.nome.trim(),
          cpf: form.cpf.replace(/\D/g, ""),
          telefone: form.telefone || undefined,
          endereco: form.endereco.trim() || undefined,
          email: form.email.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErroGeral(data.erro || "Erro ao cadastrar cliente.");
        return;
      }

      setSucesso(data);
    } catch {
      setErroGeral("Não foi possível conectar ao servidor.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="zp-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700&family=DM+Sans:wght@400;500&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        :root{
          --navy:#0d2340;--teal:#1a7a6e;--teal-h:#22a090;--green:#2e7d52;
          --white:#fff;--g50:#f8fafc;--g200:#e2e8f0;--g400:#94a3b8;--g600:#475569;
          --red:#dc2626;--red-l:#fef2f2;
          --grn-l:#f0fdf4;--grn-b:#86efac;--grn-t:#15803d;
        }
        .zp-root{min-height:100vh;font-family:'DM Sans',sans-serif;background:var(--g50);display:flex;flex-direction:column}
        .zp-bar{background:var(--navy);height:64px;display:flex;align-items:center;justify-content:space-between;padding:0 2rem;flex-shrink:0}
        .zp-logo{display:flex;align-items:center;gap:.75rem}
        .zp-logo-box{width:38px;height:38px;background:var(--teal);border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:18px}
        .zp-brand{color:var(--white);font-family:'Sora',sans-serif}
        .zp-brand .t{display:block;font-size:9px;font-weight:400;letter-spacing:3px;opacity:.55;text-transform:uppercase}
        .zp-brand .b{display:block;font-size:16px;font-weight:700;line-height:1}
        .zp-bar-right{display:flex;align-items:center;gap:1rem}
        .zp-user{font-size:13px;color:rgba(255,255,255,.7)}
        .zp-btn-out{background:rgba(255,255,255,.1);border:none;color:rgba(255,255,255,.75);padding:6px 14px;border-radius:20px;font-size:12px;cursor:pointer;font-family:'DM Sans',sans-serif;transition:.15s}
        .zp-btn-out:hover{background:rgba(255,255,255,.18);color:var(--white)}
        .zp-main{flex:1;display:flex;justify-content:center;padding:2.5rem 1.5rem}
        .zp-card{width:100%;max-width:600px;background:var(--white);border-radius:16px;padding:2.5rem;border:1px solid var(--g200);box-shadow:0 4px 24px rgba(0,0,0,.06)}
        .zp-card-head{margin-bottom:2rem}
        .zp-card-head h1{font-family:'Sora',sans-serif;font-size:22px;font-weight:600;color:var(--navy);margin-bottom:4px}
        .zp-card-head p{font-size:14px;color:var(--g400)}
        .zp-sec{font-size:11px;font-weight:600;color:var(--g400);text-transform:uppercase;letter-spacing:1px;margin-bottom:1rem}
        .zp-hr{border:none;border-top:1px solid var(--g200);margin:1.5rem 0}
        .zp-grid2{display:grid;grid-template-columns:1fr 1fr;gap:1.25rem}
        .zp-field{display:flex;flex-direction:column;gap:6px}
        .zp-label{font-size:13px;font-weight:500;color:var(--g600)}
        .zp-req{color:var(--red);font-size:11px}
        .zp-input{padding:11px 14px;border:1.5px solid var(--g200);border-radius:8px;font-size:14px;font-family:'DM Sans',sans-serif;color:var(--navy);outline:none;transition:border-color .2s;background:var(--white)}
        .zp-input:focus{border-color:var(--teal)}
        .zp-input.err{border-color:var(--red);background:var(--red-l)}
        .zp-ferr{font-size:12px;color:var(--red)}
        .zp-full{margin-top:1.25rem}
        .zp-actions{display:flex;gap:1rem;justify-content:flex-end;margin-top:2rem}
        .zp-btn-sec{padding:11px 24px;border-radius:8px;border:1.5px solid var(--g200);background:var(--white);color:var(--g600);font-size:14px;font-family:'DM Sans',sans-serif;cursor:pointer;transition:.15s}
        .zp-btn-sec:hover{border-color:var(--teal);color:var(--teal)}
        .zp-btn-pri{padding:11px 28px;border-radius:8px;background:var(--teal);color:var(--white);border:none;font-size:14px;font-weight:600;font-family:'Sora',sans-serif;cursor:pointer;transition:.15s;letter-spacing:.3px}
        .zp-btn-pri:hover:not(:disabled){background:var(--teal-h)}
        .zp-btn-pri:disabled{opacity:.55;cursor:not-allowed}
        .zp-alert{border-radius:8px;padding:12px 16px;font-size:14px;display:flex;align-items:flex-start;gap:10px;margin-top:1rem;line-height:1.5}
        .zp-alert.ok{background:var(--grn-l);border:1px solid var(--grn-b);color:var(--grn-t)}
        .zp-alert.ko{background:var(--red-l);border:1px solid #fca5a5;color:var(--red)}
        .zp-alert strong{display:block;margin-bottom:3px;font-weight:600}
        .zp-foot{height:12px;background:linear-gradient(90deg,var(--navy) 0%,var(--teal) 50%,var(--green) 100%)}
        @media(max-width:600px){.zp-grid2{grid-template-columns:1fr}.zp-card{padding:1.5rem}}
      `}</style>

      <header className="zp-bar">
        <div className="zp-logo">
          <div className="zp-logo-box">📱</div>
          <div className="zp-brand">
            <span className="t">ZERO</span>
            <span className="b">PAPER</span>
          </div>
        </div>
        <div className="zp-bar-right">
          <span className="zp-user">Olá, {auth.funcionario.nome.split(" ")[0]}</span>
          <button className="zp-btn-out" onClick={onLogout}>Sair</button>
        </div>
      </header>

      <main className="zp-main">
        <div className="zp-card">
          <div className="zp-card-head">
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
                <label className="zp-label">
                  E-mail {errors.email && <span className="zp-req">✗</span>}
                </label>
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
      </main>

      <div className="zp-foot" />
    </div>
  );
}
