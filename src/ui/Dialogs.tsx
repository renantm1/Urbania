import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { ArrowRight, ArrowUpRight, ChevronRight, Clock3, Download, FolderOpen, HardDrive, House, Leaf, LoaderCircle, Map, Plus, Route, Save, ShieldCheck, Sparkles, Trash2, Upload, Users, X } from 'lucide-react';
import { useGame } from '../state/store';
import { getMetrics } from '../core/simulation';
import { deleteSave, exportCity, importCity, listSaves, loadCity, saveCity } from '../core/persistence';
import type { SaveSlot } from '../core/types';
import { money, number } from './format';
import { Brand } from './Hud';

export function Welcome() {
  const [name, setName] = useState('Nova Aurora');
  const [latest, setLatest] = useState<SaveSlot | null>(null);
  const [loading, setLoading] = useState(false);
  const state = useGame();
  useEffect(() => { listSaves().then(saves => setLatest(saves[0] ?? null)).catch(() => {}); }, []);
  async function resume() {
    if (!latest) return;
    setLoading(true);
    try { state.restoreCity(await loadCity(latest.slot)); state.notify('Cidade carregada. A simulação começa pausada.'); }
    catch (e) { state.notify((e as Error).message, 'error'); }
    finally { setLoading(false); }
  }
  return <div className="welcome">
    <div className="welcome-top"><Brand /><span className="edition">EDIÇÃO FUNDADORES <span>01</span></span></div>
    <main className="welcome-content"><div className="welcome-eyebrow"><span /> SEU PRÓXIMO HORIZONTE</div><h1>Grandes cidades.<br />Pequenos <em>começos.</em></h1><p>Uma curva no rio. Uma rua desenhada.<br />Um lugar para chamar de seu.</p>
      <form className="welcome-form" onSubmit={e => { e.preventDefault(); state.newCity(name); }}><label htmlFor="city-name">COMO VAI SE CHAMAR SUA CIDADE?</label><div className="name-input"><Map size={19} /><input id="city-name" value={name} maxLength={40} onChange={e => setName(e.target.value)} placeholder="Nome da cidade" autoComplete="off" required /></div>
      <div className="territory-details"><span><Leaf size={14} /> Vale do Sol</span><span><Map size={14} /> 56 × 56 lotes</span><span>R$ 2 milhões iniciais</span></div>
      <button className="primary-button start-button" type="submit">Começar a construir <ArrowRight size={18} /></button></form>
      <div className="welcome-secondary">{latest && <button disabled={loading} onClick={resume}>{loading ? <LoaderCircle size={15} className="spin" /> : <PlayIcon />}Continuar {latest.city.name}<ChevronRight size={14} /></button>}<button onClick={() => state.setModal('saves')}><FolderOpen size={15} /> Carregar cidade</button></div>
      <div className="welcome-note"><ShieldCheck size={15} /><span>Sua cidade fica neste navegador.<br /><strong>Sem conta. Sem conexão obrigatória para jogar.</strong></span></div>
    </main>
    <div className="territory-tag"><div className="territory-pin"><Map size={18} /></div><div><small>TERRITÓRIO DISPONÍVEL</small><strong>Vale do Sol</strong><span>Uma nova história começa aqui.</span></div></div>
    <footer className="welcome-footer"><span>FEITO PARA IMAGINAR. CONSTRUÍDO POR VOCÊ.</span><button onClick={() => state.setModal('help')}>Conheça os controles <ArrowUpRight size={14} /></button><span>URBANIA / VERTICAL SLICE 0.1</span></footer>
  </div>;
}

function PlayIcon() { return <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor"><path d="M4 2l10 6-10 6z" /></svg>; }

function ModalShell({ title, eyebrow, children, wide = false }: { title: string; eyebrow: string; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const close = () => useGame.getState().setModal(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const trap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const focusables = ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select, a[href], [tabindex="0"]');
      if (!focusables?.length) return;
      const first = focusables[0], last = focusables[focusables.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && (document.activeElement === last || document.activeElement === ref.current)) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', trap);
    return () => { document.removeEventListener('keydown', trap); previous?.focus(); };
  }, []);
  return <div className="modal-backdrop" onPointerDown={e => { if (e.target === e.currentTarget) close(); }}><div ref={ref} role="dialog" aria-modal="true" aria-labelledby="dialog-title" tabIndex={-1} className={`modal ${wide ? 'wide' : ''}`}><div className="modal-header"><div><span className="eyebrow">{eyebrow}</span><h2 id="dialog-title">{title}</h2></div><button className="close-button" onClick={close} aria-label="Fechar janela"><X size={20} /></button></div>{children}<div className="modal-footnote"><span><span className="live-dot" /> A simulação fica pausada enquanto esta janela está aberta.</span><kbd>ESC</kbd></div></div></div>;
}

function Budget() {
  const city = useGame(s => s.city), setTax = useGame(s => s.setTax);
  const m = getMetrics(city);
  return <ModalShell title="Orçamento municipal" eyebrow="CADA ESCOLHA CONTA" wide>
    <div className="budget-summary"><div><small>EM CAIXA</small><strong>{money(city.treasury)}</strong></div><div><small>SALDO MENSAL PROJETADO</small><strong className={m.balance >= 0 ? 'positive' : 'negative'}>{m.balance >= 0 ? '+' : ''}{money(m.balance)}</strong></div></div>
    <div className="budget-columns"><section><h3><span className="positive">↗</span> Receitas mensais</h3><div className="ledger">{[['IPTU residencial', m.taxes.residential], ['Atividade comercial simulada', m.taxes.commercial], ['Atividade industrial simulada', m.taxes.industrial], ['Transferências de desenvolvimento', m.taxes.grants]].map(([label, value]) => <div key={label}><span>{label}</span><strong>{money(Number(value))}</strong></div>)}<div className="ledger-total"><span>Total de receitas</span><strong className="positive">{money(m.income)}</strong></div></div></section>
    <section><h3><span className="negative">↘</span> Despesas mensais</h3><div className="ledger">{[['Manutenção da rede viária', m.costs.roads], ['Administração municipal', m.costs.administration], ['Serviços básicos agregados', m.costs.sanitation]].map(([label, value]) => <div key={label}><span>{label}</span><strong>{money(Number(value))}</strong></div>)}<div className="ledger-total"><span>Total de despesas</span><strong>{money(m.expenses)}</strong></div></div></section></div>
    <div className="tax-control"><div><h3>Alíquota da simulação</h3><p>Uma taxa maior aumenta a arrecadação e reduz a atratividade da cidade.</p></div><strong>{city.taxRate}%</strong><input aria-label="Alíquota de impostos" type="range" min="1" max="20" step="1" value={city.taxRate} onChange={e => setTax(Number(e.target.value))} /><div className="range-labels"><span>1% · Incentivo ao crescimento</span><span>20% · Arrecadação máxima</span></div></div>
    <p className="small-note">Modelo econômico de jogo: nem todas as receitas representam tributos municipais reais. O saldo é creditado a cada 30 dias de simulação. Os custos de obras são debitados imediatamente.</p>
    <div className="investment-total"><span>Investimento acumulado em obras</span><strong>{money(city.totalConstruction)}</strong></div>
  </ModalShell>;
}

function Statistics() {
  const city = useGame(s => s.city);
  const m = getMetrics(city);
  const max = Math.max(10, m.population, ...city.history.map(row => row.population));
  const data = [0, ...city.history.map(row => row.population), m.population];
  const points = data.map((n, i) => `${i / (data.length - 1) * 620},${130 - n / max * 110}`).join(' ');
  return <ModalShell title={`O pulso de ${city.name}`} eyebrow="ESTATÍSTICAS DA CIDADE" wide>
    <div className="stat-grid">{[{ icon: Users, label: 'Habitantes', value: number(m.population), caption: `${m.households} famílias estimadas` }, { icon: House, label: 'Capacidade residencial', value: number(m.capacity), caption: `${m.capacity - m.population} vagas disponíveis` }, { icon: Route, label: 'Rede viária', value: `${number(m.roadLength)} m`, caption: `${Object.keys(city.roads).length} segmentos conectáveis` }, { icon: HardDrive, label: 'Edifícios', value: number(m.buildings), caption: `${Object.keys(city.lots).length} lotes zoneados` }].map(({ icon: Icon, label, value, caption }) => <div key={label} className="stat-tile"><Icon size={19} /><span>{label}</span><strong>{value}</strong><small>{caption}</small></div>)}</div>
    <section className="chart-section"><div><h3>Crescimento populacional</h3><span>Histórico mensal · últimos 60 meses</span></div><div className="chart"><span className="chart-max">{number(max)}</span><svg viewBox="0 0 620 150" role="img" aria-label={`População atual: ${m.population}. ${city.history.length} meses no histórico.`}><defs><linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8bc6a0" stopOpacity=".25" /><stop offset="100%" stopColor="#8bc6a0" stopOpacity="0" /></linearGradient></defs>{[30, 80, 130].map(y => <line key={y} x1="0" x2="620" y1={y} y2={y} stroke="#ffffff0c" />)}<polygon points={`0,150 ${points} 620,150`} fill="url(#chart-fill)" /><polyline points={points} fill="none" stroke="#91c9a5" strokeWidth="2.5" strokeLinejoin="round" /><circle cx="620" cy={130 - m.population / max * 110} r="4" fill="#91c9a5" /></svg><div><span>Fundação</span><span>Agora · dia {city.day + 1}</span></div></div></section>
    <div className="budget-columns stats-ledger"><section><h3>Trabalho e qualidade de vida</h3><div className="ledger"><div><span>Empregos</span><strong>{m.jobs}</strong></div><div><span>População economicamente ativa</span><strong>{m.workers}</strong></div><div><span>Trabalhadores empregados</span><strong>{m.employed}</strong></div><div><span>Desemprego</span><strong>{m.unemployment}%</strong></div><div><span>Satisfação</span><strong>{m.satisfaction}%</strong></div></div></section><section><h3>Últimos fechamentos</h3><div className="ledger">{!city.history.length ? <p className="small-note">Seu primeiro fechamento acontece no dia 30. Construa e deixe a simulação avançar.</p> : city.history.slice(-5).reverse().map(row => <div key={row.month}><span>Mês {row.month} · {row.population} habitantes</span><strong className={row.balance >= 0 ? 'positive' : 'negative'}>{row.balance >= 0 ? '+' : ''}{money(row.balance)}</strong></div>)}</div></section></div>
  </ModalShell>;
}

function Saves() {
  const state = useGame();
  const [entries, setEntries] = useState<SaveSlot[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [overwrite, setOverwrite] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const refresh = () => listSaves().then(setEntries).catch(e => setError((e as Error).message));
  useEffect(() => { void refresh(); }, []);
  const act = async (label: string, action: () => Promise<void>) => {
    setBusy(label); setError('');
    try { await action(); } catch (e) { setError((e as Error).message || 'O navegador não permitiu acessar os salvamentos. Exporte um JSON para guardar sua cidade.'); }
    finally { setBusy(null); }
  };
  const save = (slot: string) => act(slot, async () => { await saveCity(slot, useGame.getState().city); state.saved(); state.notify('Cidade salva neste navegador.'); setOverwrite(null); await refresh(); });
  const load = (slot: string) => act(slot, async () => { const city = await loadCity(slot); state.restoreCity(city); state.notify('Cidade carregada. Pressione espaço para continuar.'); });
  return <ModalShell title="Suas cidades, suas histórias" eyebrow="SALVAMENTOS LOCAIS" wide>
    <p className="dialog-description">Três espaços manuais e um automático. Salvos neste navegador por IndexedDB; exporte um arquivo para levar sua cidade com você.</p>
    {error && <div className="inline-error" role="alert">{error}</div>}
    <div className="save-slots">{['slot-1', 'slot-2', 'slot-3', 'autosave'].map((slot, index) => {
      const entry = entries.find(e => e.slot === slot);
      return <div key={slot} className={`save-slot ${entry ? 'occupied' : ''}`}><span className="slot-icon">{index === 3 ? <Clock3 size={21} /> : <Map size={21} />}</span><div className="slot-info"><small>{index === 3 ? 'SALVAMENTO AUTOMÁTICO' : `ESPAÇO ${index + 1}`}</small><strong>{entry ? entry.city.name : 'Um novo horizonte'}</strong><span>{entry ? `${number(getMetrics(entry.city).population)} habitantes · ${new Date(entry.savedAt).toLocaleString('pt-BR')}` : 'Nenhuma cidade salva neste espaço'}</span></div><div className="slot-actions">
        {entry && <button className="secondary-button" disabled={!!busy} onClick={() => void load(slot)}><FolderOpen size={14} /> Carregar</button>}
        {index < 3 && state.started && <button className="secondary-button" disabled={!!busy} onClick={() => entry ? setOverwrite(overwrite === slot ? null : slot) : void save(slot)}>{busy === slot ? <LoaderCircle size={14} className="spin" /> : <Save size={14} />}{entry ? 'Substituir' : 'Salvar aqui'}</button>}
        {entry && <button className="icon-button" title="Excluir salvamento" aria-label={`Excluir ${slot}`} disabled={!!busy} onClick={() => setConfirmDelete(confirmDelete === slot ? null : slot)}><Trash2 size={15} /></button>}
      </div>{overwrite === slot && <div className="slot-confirm"><span>Substituir a cidade salva por {state.city.name}?</span><button onClick={() => void save(slot)}>Sim, salvar</button><button onClick={() => setOverwrite(null)}>Cancelar</button></div>}{confirmDelete === slot && <div className="slot-confirm"><span>Excluir permanentemente este salvamento?</span><button onClick={() => void act(slot, async () => { await deleteSave(slot); setConfirmDelete(null); await refresh(); })}>Sim, excluir</button><button onClick={() => setConfirmDelete(null)}>Cancelar</button></div>}</div>;
    })}</div>
    <div className="save-utilities"><div>{state.started && <button className="secondary-button" onClick={() => exportCity(state.city)}><Download size={15} /> Exportar JSON</button>}<button className="secondary-button" disabled={!!busy} onClick={() => input.current?.click()}><Upload size={15} /> Importar JSON</button><input ref={input} aria-label="Arquivo JSON da cidade" type="file" accept=".json,application/json" hidden onChange={e => { const file = e.target.files?.[0]; if (file) void act('import', async () => { const city = await importCity(file); state.restoreCity(city); state.notify('Cidade importada. Salve em um espaço para mantê-la neste navegador.'); }); e.target.value = ''; }} /></div><button className="text-button" onClick={() => state.setModal('new')}><Plus size={15} /> Nova cidade</button></div>
  </ModalShell>;
}

function Settings() {
  const state = useGame();
  return <ModalShell title="Seu jeito de construir" eyebrow="CONFIGURAÇÕES">
    <div className="settings-list">{[{ key: 'shadows' as const, title: 'Sombras em tempo real', description: 'Desative para melhorar o desempenho em máquinas mais simples.' }, { key: 'showGrid' as const, title: 'Grade de construção', description: 'Mostra os lotes enquanto uma ferramenta está selecionada.' }, { key: 'autosave' as const, title: 'Salvamento automático', description: 'Guarda a cidade atual a cada 60 segundos.' }].map(setting => <label className="setting-row" key={setting.key}><span><strong>{setting.title}</strong><small>{setting.description}</small></span><input type="checkbox" checked={state[setting.key]} onChange={e => state.setSetting(setting.key, e.target.checked)} /><span className="switch" /></label>)}</div>
    <div className="settings-about"><Brand compact /><span>Vertical slice · versão 0.1</span><p>O primeiro capítulo do Urbania: ruas, zoneamento, edifícios e uma cidade que cresce com suas escolhas.</p><button className="text-button" onClick={() => state.setModal('help')}>Ajuda e controles <ArrowRight size={14} /></button></div>
    <button className="secondary-button" onClick={() => state.setModal('new')}><Plus size={15} /> Começar uma nova cidade</button>
  </ModalShell>;
}

function Help() {
  return <ModalShell title="Um pequeno guia para grandes ideias" eyebrow="BEM-VINDO À PREFEITURA" wide>
    <div className="help-steps">{[{ icon: Route, title: '01 / Conecte', text: 'Escolha Estradas. Clique no início e depois no fim do trecho. Vias se alinham à grade e se conectam automaticamente. Cruzar uma via cria um cruzamento.' }, { icon: House, title: '02 / Dê espaço', text: 'Escolha uma zona e pinte lotes ao lado das ruas. Verde recebe moradores, azul cria comércio e amarelo cria indústria. O acesso à rua é obrigatório.' }, { icon: Users, title: '03 / Veja crescer', text: 'Com a simulação rodando, edifícios surgem a cada três dias conforme a demanda. Moradores chegam, empregos são criados e o saldo é creditado a cada 30 dias.' }].map(({ icon: Icon, title, text }) => <div key={title}><Icon size={23} /><h3>{title}</h3><p>{text}</p></div>)}</div>
    <h3 className="controls-title">Mova-se com liberdade</h3><div className="controls-grid">{[['W A S D / setas', 'Mover a câmera'], ['Scroll', 'Aproximar / afastar'], ['Direito + arrastar', 'Girar e inclinar'], ['Meio + arrastar', 'Deslocar a câmera'], ['Clique esquerdo', 'Construir / selecionar'], ['Clique + arrastar', 'Pintar / demolir'], ['Espaço', 'Pausar / continuar'], ['1 · 2 · 3 · 4 · 5 · V', 'Escolher ferramenta'], ['ESC', 'Cancelar / fechar'], ['F', 'Recentralizar câmera'], ['Ctrl / ⌘ + S', 'Salvar no espaço 1'], ['Ctrl / ⌘ + Shift + S', 'Abrir salvamentos']].map(([key, action]) => <div key={key}><span>{action}</span><kbd>{key}</kbd></div>)}</div>
    <div className="help-tip"><Sparkles size={19} /><p>Comece pequeno: uma rua de 80 metros, moradias de um lado e alguns comércios do outro. As barras RCI indicam onde sua cidade quer crescer. Sem acesso viário, os lotes não se desenvolvem e edifícios perdem moradores.</p></div>
    <p className="small-note">A Fase 1 usa serviços básicos agregados no orçamento. Energia, água, serviços públicos individuais, veículos e evolução de edifícios serão adicionados nas próximas fases.</p>
  </ModalShell>;
}

function NewCity() {
  const [name, setName] = useState('Nova Aurora');
  const state = useGame();
  return <ModalShell title="Toda cidade começa com uma ideia" eyebrow="UM NOVO HORIZONTE"><form className="new-city-form" onSubmit={e => { e.preventDefault(); state.newCity(name); }}><label htmlFor="new-city-name">Nome da cidade</label><input id="new-city-name" value={name} maxLength={40} required onChange={e => setName(e.target.value)} /><div className="new-city-facts"><span><Leaf size={18} /> Vale do Sol</span><span>R$ 2.000.000 iniciais</span></div><p className="small-note">O progresso atual não salvo será descartado. Os espaços já salvos serão preservados; o salvamento automático será substituído após um minuto na nova cidade.</p><button className="primary-button" type="submit">Criar nova cidade <ArrowRight size={17} /></button></form></ModalShell>;
}

export function Dialogs() {
  const modal = useGame(s => s.modal);
  if (modal === 'budget') return <Budget />;
  if (modal === 'statistics') return <Statistics />;
  if (modal === 'saves') return <Saves />;
  if (modal === 'settings') return <Settings />;
  if (modal === 'help') return <Help />;
  if (modal === 'new') return <NewCity />;
  return null;
}
