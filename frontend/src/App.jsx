import { useCallback, useEffect, useState } from 'react';

const tokenKey = 'daily-diet-token';

async function request(path, { token, ...options } = {}) {
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  });
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(result.message || 'Não foi possível concluir a solicitação.');
  }
  return response.status === 204 ? null : response.json();
}

function toLocalInput(date) {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

function formatDate(value) {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function AuthScreen({ onLogin }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'register') {
        await request('/users', { method: 'POST', body: JSON.stringify(form) });
      }
      const session = await request('/sessions', {
        method: 'POST',
        body: JSON.stringify({ email: form.email, password: form.password })
      });
      onLogin(session);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function changeMode(next) {
    setMode(next);
    setError('');
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="brand-mark">dd<span>.</span></div>
        <p className="eyebrow">BEM-VINDO À SUA ROTINA</p>
        <h1>Um dia de cada vez.</h1>
        <p className="muted">Acompanhe suas refeições e encontre seu equilíbrio.</p>
        <div className="auth-tabs">
          <button className={mode === 'login' ? 'active' : ''} onClick={() => changeMode('login')}>Entrar</button>
          <button className={mode === 'register' ? 'active' : ''} onClick={() => changeMode('register')}>Criar conta</button>
        </div>
        <form onSubmit={submit} className="form-stack">
          {mode === 'register' && (
            <label>Seu nome
              <input required maxLength="80" autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Como podemos te chamar?" />
            </label>
          )}
          <label>E-mail
            <input required type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="voce@email.com" />
          </label>
          <label>Senha
            <input required minLength="6" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Mínimo de 6 caracteres" />
          </label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="button primary full" disabled={busy}>{busy ? 'Aguarde...' : mode === 'login' ? 'Entrar na minha conta' : 'Criar minha conta'} <span>→</span></button>
        </form>
        <p className="auth-note">Seu espaço pessoal para cultivar escolhas conscientes.</p>
      </section>
      <aside className="auth-aside">
        <div className="aside-orbit orbit-one" /><div className="aside-orbit orbit-two" />
        <span className="aside-kicker">LEVEZA TAMBÉM É CONSTÂNCIA</span>
        <h2>Cuidar de você<br />começa no agora.</h2>
        <p>Pequenos registros. Grandes percepções. Acompanhe sua jornada, sem pressão.</p>
        <div className="aside-footer"><span className="status-dot" /> SEU PROGRESSO, NO SEU TEMPO</div>
      </aside>
    </main>
  );
}

function MealForm({ meal, onSave, onCancel }) {
  const [form, setForm] = useState({
    name: meal?.name || '',
    description: meal?.description || '',
    dateTime: meal ? toLocalInput(new Date(meal.dateTime)) : toLocalInput(new Date()),
    isOnDiet: meal?.isOnDiet ?? true
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await onSave({ ...form, dateTime: new Date(form.dateTime).toISOString() });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="meal-form" onSubmit={submit}>
      <label>Nome da refeição<input required maxLength="100" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex.: Almoço" /></label>
      <label>Descrição<textarea required maxLength="1000" rows="4" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="O que você comeu?" /></label>
      <label>Data e horário<input required type="datetime-local" value={form.dateTime} onChange={(e) => setForm({ ...form, dateTime: e.target.value })} /></label>
      <fieldset>
        <legend>Está dentro da dieta?</legend>
        <div className="choice-row">
          <label className={`choice ${form.isOnDiet ? 'selected good' : ''}`}><input type="radio" name="diet" checked={form.isOnDiet} onChange={() => setForm({ ...form, isOnDiet: true })} /><span className="status-dot" /> Sim, dentro</label>
          <label className={`choice ${!form.isOnDiet ? 'selected bad' : ''}`}><input type="radio" name="diet" checked={!form.isOnDiet} onChange={() => setForm({ ...form, isOnDiet: false })} /><span className="status-dot" /> Fora da dieta</label>
        </div>
      </fieldset>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="form-actions"><button type="button" className="button secondary" onClick={onCancel}>Cancelar</button><button className="button primary" disabled={busy}>{busy ? 'Salvando...' : meal ? 'Salvar alterações' : 'Registrar refeição'} <span>→</span></button></div>
    </form>
  );
}

function App() {
  const [token, setToken] = useState(() => localStorage.getItem(tokenKey));
  const [user, setUser] = useState(null);
  const [meals, setMeals] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [page, setPage] = useState('meals');
  const [dialog, setDialog] = useState(null);
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(Boolean(token));

  const logout = useCallback(() => {
    localStorage.removeItem(tokenKey);
    setToken(null);
    setUser(null);
    setMeals([]);
    setMetrics(null);
  }, []);

  const refresh = useCallback(async (activeToken = token) => {
    const [profile, mealList, stats] = await Promise.all([
      request('/me', { token: activeToken }),
      request('/meals', { token: activeToken }),
      request('/metrics', { token: activeToken })
    ]);
    setUser(profile);
    setMeals(mealList);
    setMetrics(stats);
  }, [token]);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    refresh(token).catch(() => logout()).finally(() => setLoading(false));
  }, [token, refresh, logout]);

  useEffect(() => {
    if (!notice) return undefined;
    const timeout = setTimeout(() => setNotice(''), 3200);
    return () => clearTimeout(timeout);
  }, [notice]);

  function login(session) {
    localStorage.setItem(tokenKey, session.token);
    setToken(session.token);
    setUser(session.user);
  }

  async function saveMeal(values) {
    const editing = dialog?.type === 'edit';
    await request(editing ? `/meals/${dialog.meal.id}` : '/meals', {
      token,
      method: editing ? 'PUT' : 'POST',
      body: JSON.stringify(values)
    });
    await refresh();
    setDialog(null);
    setNotice(editing ? 'Refeição atualizada com sucesso.' : 'Refeição registrada com sucesso.');
  }

  async function deleteMeal(meal) {
    if (!window.confirm(`Apagar "${meal.name}"? Essa ação não pode ser desfeita.`)) return;
    try {
      await request(`/meals/${meal.id}`, { token, method: 'DELETE' });
      await refresh();
      setNotice('Refeição apagada.');
    } catch (error) {
      setNotice(error.message);
    }
  }

  if (loading) return <div className="loading-screen"><div className="brand-mark">dd<span>.</span></div><p>Preparando seu espaço...</p></div>;
  if (!token || !user) return <AuthScreen onLogin={login} />;

  const initials = user.name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase();
  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="wordmark" href="#" onClick={(e) => { e.preventDefault(); setPage('meals'); }}><span className="brand-mark">dd<span>.</span></span><span className="wordmark-divider" /> DAILY DIET</a>
        <nav className="nav-links">
          <button className={page === 'meals' ? 'current' : ''} onClick={() => setPage('meals')}>Minhas refeições</button>
          <button className={page === 'metrics' ? 'current' : ''} onClick={() => setPage('metrics')}>Meu progresso</button>
        </nav>
        <div className="profile-area"><span className="avatar">{initials}</span><span className="profile-name">{user.name}</span><button className="logout-button" onClick={logout} title="Sair" aria-label="Sair">↗</button></div>
      </header>

      <main className="main-content">
        {page === 'meals' ? (
          <>
            <section className="welcome-row">
              <div><p className="eyebrow">SEU DIÁRIO, SEU RITMO</p><h1>Olá, {user.name.split(' ')[0]} <span className="wave">✳</span></h1><p className="muted">Cada escolha conta. Como está sendo sua jornada?</p></div>
              <button className="button primary" onClick={() => setDialog({ type: 'create' })}><span className="plus">+</span> Nova refeição</button>
            </section>
            <section className="summary-strip">
              <div className="summary-copy"><span className="summary-icon">✳</span><div><strong>{metrics?.totalMeals ?? 0}</strong><span>refeições registradas</span></div></div>
              <div className="summary-divider" />
              <div className="summary-copy"><span className="status-dot good-dot" /><div><strong>{metrics?.mealsWithinDiet ?? 0}</strong><span>dentro da dieta</span></div></div>
              <div className="summary-divider" />
              <div className="summary-copy"><span className="status-dot bad-dot" /><div><strong>{metrics?.mealsOutsideDiet ?? 0}</strong><span>fora da dieta</span></div></div>
              <button className="summary-link" onClick={() => setPage('metrics')}>Ver progresso <span>↗</span></button>
            </section>
            <section className="list-heading"><div><p className="eyebrow">REGISTROS RECENTES</p><h2>Suas refeições</h2></div><span className="count-pill">{meals.length} {meals.length === 1 ? 'registro' : 'registros'}</span></section>
            {meals.length ? (
              <div className="meal-list">
                {meals.map((meal) => (
                  <article className="meal-row" key={meal.id}>
                    <span className="meal-time">{formatDate(meal.dateTime)}</span>
                    <span className="meal-row-divider" />
                    <div className="meal-info"><strong>{meal.name}</strong><p>{meal.description}</p></div>
                    <span className={`diet-tag ${meal.isOnDiet ? 'on-diet' : 'off-diet'}`}><span className="status-dot" />{meal.isOnDiet ? 'Dentro da dieta' : 'Fora da dieta'}</span>
                    <div className="meal-actions"><button aria-label={`Editar ${meal.name}`} title="Editar" onClick={() => setDialog({ type: 'edit', meal })}>↗</button><button aria-label={`Apagar ${meal.name}`} title="Apagar" onClick={() => deleteMeal(meal)}>×</button></div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state"><div className="empty-illustration">✳</div><h3>Seu diário começa aqui.</h3><p>Registre sua primeira refeição e acompanhe sua jornada com mais clareza.</p><button className="button secondary" onClick={() => setDialog({ type: 'create' })}>Registrar primeira refeição <span>→</span></button></div>
            )}
          </>
        ) : (
          <section className="metrics-page">
            <p className="eyebrow">OLHE PARA O CAMINHO QUE VOCÊ JÁ FEZ</p><h1>Seu progresso<span className="wave">✳</span></h1><p className="muted">Consistência não é perfeição. É continuar, uma refeição de cada vez.</p>
            <div className="metrics-grid">
              <article className="metric-card featured"><span className="metric-label">SUA MELHOR SEQUÊNCIA</span><span className="metric-number">{metrics?.bestOnDietSequence ?? 0}</span><span className="metric-caption">refeições seguidas dentro da dieta</span><span className="metric-decoration">↗</span></article>
              <article className="metric-card"><span className="metric-icon green">✓</span><span className="metric-label">DENTRO DA DIETA</span><span className="metric-number">{metrics?.mealsWithinDiet ?? 0}</span><span className="metric-caption">refeições registradas</span></article>
              <article className="metric-card"><span className="metric-icon coral">○</span><span className="metric-label">FORA DA DIETA</span><span className="metric-number">{metrics?.mealsOutsideDiet ?? 0}</span><span className="metric-caption">refeições registradas</span></article>
              <article className="metric-card"><span className="metric-icon neutral">＋</span><span className="metric-label">TOTAL DE REFEIÇÕES</span><span className="metric-number">{metrics?.totalMeals ?? 0}</span><span className="metric-caption">em toda a sua jornada</span></article>
            </div>
            {metrics?.totalMeals > 0 && <div className="progress-note"><span className="status-dot good-dot" /><p>Você está construindo sua história. Continue celebrando cada passo, dentro ou fora da dieta.</p></div>}
            <button className="button secondary back-button" onClick={() => setPage('meals')}>← Voltar às refeições</button>
          </section>
        )}
      </main>

      <footer className="site-footer"><span>DAILY DIET</span><span>Cuide de você, no seu tempo. <span className="footer-spark">✳</span></span></footer>
      {notice && <div className="toast" role="status">{notice}</div>}
      {dialog && (
        <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setDialog(null); }}>
          <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <div className="modal-heading"><div><p className="eyebrow">{dialog.type === 'edit' ? 'ATUALIZE SEU REGISTRO' : 'UM NOVO REGISTRO'}</p><h2 id="modal-title">{dialog.type === 'edit' ? 'Editar refeição' : 'Registrar refeição'}</h2></div><button className="modal-close" onClick={() => setDialog(null)} aria-label="Fechar">×</button></div>
            <MealForm meal={dialog.meal} onSave={saveMeal} onCancel={() => setDialog(null)} />
          </section>
        </div>
      )}
    </div>
  );
}

export default App;
