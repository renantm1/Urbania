import { useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, BarChart3, Check, ChevronDown, ChevronRight, CircleHelp, Compass, Factory, Hammer, House, Landmark, Leaf, MousePointer2, Pause, Play, Route, Save, Settings2, ShoppingBag, Smile, Trash2, TrendingUp, Users, Wallet, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Tool, ZoneKind } from '../core/types';
import { capacityOf, getMetrics } from '../core/simulation';
import { CELL_SIZE, ROAD_COST, ZONE_COST, hasRoadAccess, keyOf, roadLine } from '../core/world';
import { useGame } from '../state/store';
import { dateLabel, money, number, shortMoney } from './format';

export function Brand({ compact = false }: { compact?: boolean }) {
  return <div className={`brand ${compact ? 'compact' : ''}`}><span className="brand-mark"><i /><i /><i /></span><span>URBANIA{!compact && <small>BUILD YOUR CITY</small>}</span></div>;
}

const tools: { id: Tool; name: string; key: string; icon: LucideIcon; color?: string }[] = [
  { id: 'road', name: 'Estradas', key: '1', icon: Route },
  { id: 'residential', name: 'Residencial', key: '2', icon: House, color: '#94c6a1' },
  { id: 'commercial', name: 'Comercial', key: '3', icon: ShoppingBag, color: '#8eb8d9' },
  { id: 'industrial', name: 'Industrial', key: '4', icon: Factory, color: '#d9bc7d' },
  { id: 'bulldoze', name: 'Demolição', key: '5', icon: Hammer, color: '#d6a18b' },
  { id: 'select', name: 'Inspecionar', key: 'V', icon: MousePointer2 },
];
const zoneNames = { residential: 'Residencial', commercial: 'Comercial', industrial: 'Industrial' };

export function Hud() {
  const state = useGame();
  const m = getMetrics(state.city);
  const [showObjectives, setShowObjectives] = useState(true);
  const [showCity, setShowCity] = useState(true);
  const roadCount = Object.keys(state.city.roads).length;
  const homeLots = Object.values(state.city.lots).filter(lot => lot.kind === 'residential').length;
  const selectedLot = state.selected ? state.city.lots[keyOf(state.selected)] : null;
  const selectedRoad = state.selected ? state.city.roads[keyOf(state.selected)] : null;
  const pendingCost = state.anchor && state.hover ? roadLine(state.anchor, state.hover).filter(cell => state.city.roads[keyOf(cell)]?.kind !== state.roadKind).reduce((sum, cell) => sum + (state.city.roads[keyOf(cell)] ? Math.abs(ROAD_COST[state.roadKind] - ROAD_COST[state.city.roads[keyOf(cell)].kind]) : ROAD_COST[state.roadKind]), 0) : null;
  const objective = roadCount >= 5 && homeLots >= 4 && m.population >= 10;
  return <div className="hud">
    <header className="topbar panel">
      <Brand compact />
      <button className="city-identity" title="Estatísticas da cidade" onClick={() => state.setModal('statistics')}><strong>{state.city.name}</strong><span>Vale do Sol <ChevronDown size={11} /></span></button>
      <div className="top-divider" />
      <button className="metric population" title="Ver estatísticas de população" onClick={() => state.setModal('statistics')}><Users size={18} /><span><small>POPULAÇÃO</small><strong data-testid="population">{number(m.population)}</strong></span></button>
      <button className="metric treasury" title="Abrir orçamento municipal" onClick={() => state.setModal('budget')}><Wallet size={18} /><span><small>CAIXA MUNICIPAL</small><strong data-testid="treasury">{shortMoney(state.city.treasury)}</strong></span></button>
      <button className={`monthly ${m.balance < 0 ? 'negative' : ''}`} title="Saldo mensal projetado; crédito a cada 30 dias" onClick={() => state.setModal('budget')}><TrendingUp size={14} /><span>{m.balance >= 0 ? '+' : ''}{money(m.balance)}<small>/ mês</small></span></button>
      <div className="metric happiness" title="Satisfação calculada por empregos, impostos, poluição e acesso viário"><Smile size={19} /><span><small>SATISFAÇÃO</small><strong>{m.satisfaction}<em>%</em></strong></span></div>
      <div className="time-controls"><span className="game-date">{dateLabel(state.city.day)}</span><div className="speed-controls"><button aria-label={state.speed ? 'Pausar simulação' : 'Continuar simulação'} className={state.speed === 0 ? 'active' : ''} onClick={state.togglePause}>{state.speed ? <Pause size={13} fill="currentColor" /> : <Play size={13} fill="currentColor" />}</button>{([1, 2, 4] as const).map(speed => <button key={speed} aria-label={`Velocidade ${speed}x`} aria-pressed={state.speed === speed} className={state.speed === speed ? 'active' : ''} onClick={() => state.setSpeed(speed)}>{speed}×</button>)}</div></div>
      <div className="header-actions"><button title="Salvar e carregar (Ctrl+S)" aria-label="Salvamentos" onClick={() => state.setModal('saves')}><Save size={18} /></button><button title="Configurações" aria-label="Configurações" onClick={() => state.setModal('settings')}><Settings2 size={18} /></button></div>
    </header>

    <aside className="left-stack">
      <section className={`objective-card panel ${objective ? 'complete' : ''}`}>
        <button className="section-toggle" onClick={() => setShowObjectives(!showObjectives)}><span className="eyebrow"><span className="live-dot" />{objective ? 'PRIMEIRO BAIRRO CONCLUÍDO' : 'UM NOVO COMEÇO'}</span><ChevronDown size={14} className={!showObjectives ? 'flipped' : ''} /></button>
        {showObjectives && <><h2>{objective ? 'Sua cidade está viva.' : 'Tudo começa com uma rua.'}</h2><p>{objective ? 'Expanda os bairros e equilibre moradias e empregos para continuar crescendo.' : 'Desenhe as primeiras vias e abra espaço para novas histórias.'}</p><div className="objective-list">
          {[{ done: roadCount >= 5, label: 'Construa 40 m de ruas', value: `${Math.min(roadCount * CELL_SIZE, 40)}/40 m` }, { done: homeLots >= 4, label: 'Zoneie 4 lotes residenciais', value: `${Math.min(homeLots, 4)}/4` }, { done: m.population >= 10, label: 'Receba 10 moradores', value: `${Math.min(m.population, 10)}/10` }].map((step, i) => <div className={step.done ? 'done' : ''} key={step.label}><span className="step-indicator">{step.done ? <Check size={11} /> : i + 1}</span><span>{step.label}</span><small>{step.value}</small></div>)}
        </div><div className="objective-progress"><span style={{ width: `${([roadCount >= 5, homeLots >= 4, m.population >= 10].filter(Boolean).length / 3) * 100}%` }} /></div></>}
      </section>
      <section className="city-card panel">
        <button className="section-toggle" onClick={() => setShowCity(!showCity)}><span className="eyebrow">PULSO DA CIDADE</span><ChevronDown size={14} className={!showCity ? 'flipped' : ''} /></button>
        {showCity && <><div className="demand-heading"><span>Demanda por zoneamento</span><span>RCI</span></div><div className="demand-bars">{(['residential', 'commercial', 'industrial'] as ZoneKind[]).map(kind => <button key={kind} onClick={() => state.setTool(kind)} title={`${zoneNames[kind]}: ${m.demand[kind]}% de demanda`}><span className={`demand-track ${kind}`}><span style={{ height: `${m.demand[kind]}%` }} /></span><small>{zoneNames[kind]}</small></button>)}</div><div className="city-facts"><div><span>Empregos disponíveis</span><strong>{m.jobs}</strong></div><div><span>Moradias ocupadas</span><strong>{m.population} <em>/ {m.capacity}</em></strong></div><div><span>Rede viária</span><strong>{number(m.roadLength)} <em>m</em></strong></div></div><button className="text-button" onClick={() => state.setModal('statistics')}>Ver estatísticas <ArrowUpRight size={13} /></button></>}
      </section>
    </aside>

    <div className="map-controls"><button className="panel" title="Recentralizar câmera (F)" aria-label="Recentralizar câmera" onClick={state.resetCamera}><Compass size={22} /><span>N</span></button><button className="panel" title="Ajuda e controles" aria-label="Ajuda e controles" onClick={() => state.setModal('help')}><CircleHelp size={19} /></button></div>

    {state.selected && <aside className="selection-card panel"><div className="section-toggle"><span className="eyebrow">INSPEÇÃO DO TERRENO</span><button aria-label="Fechar inspeção" onClick={() => useGame.setState({ selected: null })}><X size={16} /></button></div>
      <div className={`selection-icon ${selectedLot?.kind ?? ''}`}>{selectedRoad ? <Route size={28} /> : selectedLot?.kind === 'industrial' ? <Factory size={28} /> : selectedLot?.kind === 'commercial' ? <ShoppingBag size={28} /> : selectedLot ? <House size={28} /> : <Leaf size={28} />}</div>
      <h2>{selectedRoad ? (selectedRoad.kind === 'street' ? 'Rua de bairro' : 'Avenida urbana') : selectedLot ? (selectedLot.building ? (selectedLot.kind === 'residential' ? 'Residência' : selectedLot.kind === 'commercial' ? 'Comércio local' : 'Galpão industrial') : 'Lote ' + zoneNames[selectedLot.kind].toLowerCase()) : 'Terreno livre'}</h2>
      <p className="selection-address">Quadra {state.selected.x + 1} · Lote {state.selected.z + 1}</p>
      {selectedLot ? <><div className="info-rows"><div><span>Zoneamento</span><strong>{zoneNames[selectedLot.kind]}</strong></div><div><span>Acesso à rua</span><strong className={hasRoadAccess(selectedLot, state.city.roads) ? 'positive' : 'negative'}>{hasRoadAccess(selectedLot, state.city.roads) ? 'Conectado' : 'Sem acesso'}</strong></div>{selectedLot.building ? <><div><span>{selectedLot.kind === 'residential' ? 'Moradores' : 'Trabalhadores'}</span><strong>{selectedLot.building.occupants} / {capacityOf(selectedLot)}</strong></div><div><span>Idade do edifício</span><strong>{selectedLot.building.age} dias</strong></div></> : <div><span>Demanda atual</span><strong>{m.demand[selectedLot.kind]}%</strong></div>}</div>{!selectedLot.building && <p className="small-note">{hasRoadAccess(selectedLot, state.city.roads) ? 'O setor privado construirá aqui quando houver demanda. Avance a simulação para acompanhar.' : 'Construa uma rua ao lado do lote para permitir seu desenvolvimento.'}</p>}</> : selectedRoad ? <div className="info-rows"><div><span>Comprimento</span><strong>8 m</strong></div><div><span>Manutenção</span><strong>{money(selectedRoad.kind === 'avenue' ? 35 : 18)} / mês</strong></div><div><span>Conexões</span><strong>{[{ x: selectedRoad.x + 1, z: selectedRoad.z }, { x: selectedRoad.x - 1, z: selectedRoad.z }, { x: selectedRoad.x, z: selectedRoad.z + 1 }, { x: selectedRoad.x, z: selectedRoad.z - 1 }].filter(cell => state.city.roads[keyOf(cell)]).length}</strong></div></div> : <p className="small-note">Escolha uma ferramenta para construir neste território.</p>}
      {(selectedLot || selectedRoad) && <button className="danger-button" onClick={() => state.setTool('bulldoze')}><Trash2 size={14} /> Usar ferramenta de demolição</button>}
    </aside>}

    <div className="bottom-stack">
      {state.tool !== 'select' && <section className="tool-options panel">
        <div className="tool-heading"><span className={`tool-mini-icon ${state.tool}`}>{state.tool === 'road' ? <Route size={18} /> : state.tool === 'bulldoze' ? <Hammer size={18} /> : state.tool === 'residential' ? <House size={18} /> : state.tool === 'commercial' ? <ShoppingBag size={18} /> : <Factory size={18} />}</span><div><strong>{state.tool === 'road' ? 'Desenhe sua próxima conexão' : state.tool === 'bulldoze' ? 'Abra espaço para o novo' : `Zona ${zoneNames[state.tool].toLowerCase()}`}</strong><small>{state.tool === 'road' ? (state.anchor ? 'Clique no ponto final · ESC cancela o trecho' : 'Clique no início e no fim · alinhamento automático') : state.tool === 'bulldoze' ? 'Clique ou arraste para demolir · R$ 180 por construção' : 'Clique ou arraste perto das ruas · crescimento automático'}</small></div></div>
        {state.tool === 'road' ? <div className="road-options"><button className={state.roadKind === 'street' ? 'selected' : ''} onClick={() => state.setRoadKind('street')}><span className="road-swatch street" /><span>Rua de bairro<small>2 faixas · {money(150)}/m</small></span></button><button className={state.roadKind === 'avenue' ? 'selected' : ''} onClick={() => state.setRoadKind('avenue')}><span className="road-swatch avenue" /><span>Avenida urbana<small>4 faixas · {money(300)}/m</small></span></button><div className="tool-cost"><small>{pendingCost === null ? 'CUSTO POR TRECHO' : 'ESTE TRECHO'}</small><strong>{money(pendingCost ?? ROAD_COST[state.roadKind])}</strong>{pendingCost === null && <span>8 metros</span>}</div></div> : <div className="brush-options"><span>Tamanho do pincel</span>{[1, 3, 5].map(size => <button key={size} className={state.brush === size ? 'selected' : ''} aria-label={`Pincel ${size} por ${size}`} onClick={() => state.setBrush(size)}>{size}×{size}</button>)}{state.tool !== 'bulldoze' && <small>{money(ZONE_COST)} / lote</small>}</div>}
      </section>}
      <nav className="toolbar panel" aria-label="Ferramentas de construção"><div className="tool-group">{tools.map(({ id, name, key, icon: Icon, color }) => <button data-testid={`tool-${id}`} key={id} aria-label={name} aria-pressed={state.tool === id} className={`${state.tool === id ? 'active' : ''} ${id}`} onClick={() => state.setTool(id)}><span className="tool-icon" style={{ color }}><Icon size={23} strokeWidth={1.6} /></span><span>{name}</span><kbd>{key}</kbd></button>)}</div><div className="toolbar-divider" /><button onClick={() => state.setModal('budget')} aria-label="Orçamento"><span className="tool-icon"><Landmark size={23} strokeWidth={1.6} /></span><span>Orçamento</span></button><button onClick={() => state.setModal('statistics')} aria-label="Estatísticas"><span className="tool-icon"><BarChart3 size={23} strokeWidth={1.6} /></span><span>Estatísticas</span></button></nav>
    </div>
    <footer className="statusbar"><span><span className={`status-dot ${!state.speed ? 'paused' : ''}`} />{!state.speed ? 'Simulação pausada' : 'Cidade em simulação'}<span className="status-separator">/</span>{state.lastSaved ? 'Salvo às ' + new Date(state.lastSaved).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'Salvamento automático a cada minuto'}</span><div><span><kbd>W A S D</kbd> mover</span><span><kbd>Scroll</kbd> zoom</span><span><kbd>Botão direito</kbd> girar</span><button onClick={() => state.setModal('help')}>Todos os controles <ChevronRight size={12} /></button></div></footer>
    {!state.speed && <div className="paused-label"><Pause size={12} /> PAUSADO <span>ESPAÇO para continuar</span></div>}
    {state.city.treasury < 100_000 && <div className="city-alert"><Wallet size={15} /><span>Caixa baixo. Revise o orçamento antes de expandir.</span><button onClick={() => state.setModal('budget')}>Ver orçamento <ArrowDownLeft size={12} /></button></div>}
  </div>;
}
