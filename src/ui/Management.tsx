import { useState } from 'react';
import { BusFront, Check, Droplets, Flame, GraduationCap, HeartPulse, Landmark, Layers3, LockKeyhole, Map, Shield, Sparkles, Trash2, Trees, Zap } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { FacilityKind, Layer, PolicyKind } from '../core/types';
import { FACILITIES, facilityAccess, serviceRadius, MILESTONES, POLICY_INFO, unlocked } from '../core/services';
import { getMetrics } from '../core/simulation';
import { EVENT_INFO } from '../core/events';
import { planTraffic, trafficEngine } from '../core/traffic';
import { useGame } from '../state/store';
import type { ManagementTab } from '../state/store';
import { dateLabel, money, number } from './format';

export const FACILITY_ICONS: Record<FacilityKind, LucideIcon> = { power: Zap, water: Droplets, waste: Trash2, school: GraduationCap, hospital: HeartPulse, police: Shield, fire: Flame, cityhall: Landmark, park: Trees, bus: BusFront };
export const LAYERS: { id: Layer; label: string; description: string }[] = [
  { id: 'none', label: 'Vista natural', description: 'Materiais originais da cidade.' },
  { id: 'density', label: 'Densidade populacional', description: 'Ocupação dos edifícios residenciais.' },
  { id: 'value', label: 'Valor dos terrenos', description: 'Serviços, parques, mobilidade e poluição.' },
  { id: 'traffic', label: 'Trânsito', description: 'Demanda de viagens nas rotas, em relação à capacidade viária.' },
  { id: 'pollution', label: 'Poluição', description: 'Influência local da indústria e da coleta insuficiente.' },
  { id: 'crime', label: 'Risco de criminalidade', description: 'Risco relativo a partir da cobertura policial.' },
  { id: 'education', label: 'Educação', description: 'Cobertura e capacidade das escolas.' },
  { id: 'health', label: 'Saúde', description: 'Cobertura e capacidade dos hospitais.' },
  { id: 'energy', label: 'Energia', description: 'Atendimento por rede conectada e capacidade disponível.' },
  { id: 'water', label: 'Água', description: 'Atendimento por rede conectada e capacidade disponível.' },
];
const tabs: { id: ManagementTab; label: string }[] = [{ id: 'services', label: 'Serviços' }, { id: 'infrastructure', label: 'Infraestrutura' }, { id: 'transport', label: 'Transporte' }, { id: 'policies', label: 'Políticas' }, { id: 'layers', label: 'Mapas' }, { id: 'progression', label: 'Marcos' }, { id: 'events', label: 'Eventos' }];

function FacilityCard({ kind }: { kind: FacilityKind }) {
  const state = useGame(), spec = FACILITIES[kind], Icon = FACILITY_ICONS[kind];
  const installations = Object.values(state.city.facilities).filter(f => f.kind === kind);
  const active = installations.filter(f => facilityAccess(f, state.city)).length;
  const available = unlocked(state.city, spec.unlock);
  return <article className="facility-card"><div className="facility-card-heading"><span className="facility-symbol" style={{ color: spec.color }}><Icon size={23} /></span><div><h3>{spec.name}</h3><small>{installations.length} instalada(s) · {active} conectada(s)</small></div></div>
    <div className="facility-spec"><span>Capacidade <strong>{number(Math.round(spec.capacity * state.city.funding[kind] / 100))}</strong></span><span>Alcance <strong>{Math.round(serviceRadius(state.city, kind) * 8)} m</strong></span><span>Manutenção <strong>{money(Math.round(spec.upkeep * state.city.funding[kind] / 100))}/mês</strong></span></div>
    <label className="funding-control"><span>Financiamento <strong>{state.city.funding[kind]}%</strong></span><input aria-label={`Financiamento ${spec.name}`} type="range" min="0" max="150" step="10" value={state.city.funding[kind]} onChange={e => state.setFunding(kind, Number(e.target.value))} /></label>
    <button className="secondary-button" disabled={!available || state.city.treasury < spec.cost} onClick={() => state.selectFacility(kind)}>{available ? <Map size={14} /> : <LockKeyhole size={14} />}{available ? `Construir · ${money(spec.cost)}` : `Marco: ${number(Math.round(spec.unlock * state.city.milestoneScale))} habitantes`}</button>
  </article>;
}

function Infrastructure() {
  const state = useGame(), m = getMetrics(state.city);
  return <><p className="dialog-description">As redes seguem as ruas conectadas. Contratos regionais atendem até 120 unidades de consumo iniciais; expanda a capacidade com instalações locais. Produção em outra rede viária não atende um bairro isolado.</p>
    <div className="utility-grid">{([{ key: 'energy', name: 'Energia', unit: 'unidades', icon: Zap }, { key: 'water', name: 'Água', unit: 'unidades', icon: Droplets }, { key: 'sewage', name: 'Esgoto', unit: 'unidades', icon: Droplets }, { key: 'waste', name: 'Lixo', unit: 'unidades', icon: Trash2 }] as const).map(({ key, name, unit, icon: Icon }) => <div className="utility-card" key={key}><Icon size={18} /><span>{name}</span><strong className={m.coverage[key] < .8 ? 'negative' : 'positive'}>{Math.round(m.coverage[key] * 100)}%</strong><div className="coverage-track"><i style={{ width: `${m.coverage[key] * 100}%` }} /></div><small>{number(m.utilities[key].demand)} / {number(Math.round(m.utilities[key].capacity))} {unit}</small><em>consumo / capacidade da cidade</em></div>)}</div>
    <div className="facility-grid">{(['power', 'water', 'waste'] as FacilityKind[]).map(kind => <FacilityCard kind={kind} key={kind} />)}</div></>;
}

function Transport() {
  const state = useGame(), m = getMetrics(state.city), plan = planTraffic(state.city);
  const stops = Object.entries(state.city.facilities).filter(([, f]) => f.kind === 'bus');
  const [from, setFrom] = useState(''), [to, setTo] = useState('');
  return <><div className="transport-summary"><div><small>PRESSÃO VIÁRIA</small><strong>{m.congestion}%</strong></div><div><small>AGENTES ATIVOS</small><strong>{trafficEngine.activeCount}</strong></div><div><small>VIAGENS CONCLUÍDAS NA SESSÃO</small><strong>{number(trafficEngine.completed)}</strong></div><div><small>LINHAS DE ÔNIBUS</small><strong>{state.city.busLines.length}</strong></div></div>
    <p className="small-note">Carros, caminhões e veículos de serviço seguem rotas A* nas vias. São agentes representativos da população agregada. Fila e semáforos reduzem a velocidade; vias saturadas reduzem produtividade e satisfação. {plan.disconnected > 0 && `${plan.disconnected} grupos residenciais não têm trajeto até um empregador.`}</p>
    <div className="facility-grid"><FacilityCard kind="bus" /><div className="line-builder"><h3>Conecte duas estações</h3><p>As estações precisam pertencer à mesma rede viária. Cada linha reduz a demanda por carros e amplia a cobertura de mobilidade.</p><label>Origem<select aria-label="Estação de origem" value={from} onChange={e => setFrom(e.target.value)}><option value="">Escolher estação</option>{stops.map(([id, f]) => <option key={id} value={id}>Estação {f.x + 1} · {f.z + 1}</option>)}</select></label><label>Destino<select aria-label="Estação de destino" value={to} onChange={e => setTo(e.target.value)}><option value="">Escolher estação</option>{stops.map(([id, f]) => <option key={id} value={id}>Estação {f.x + 1} · {f.z + 1}</option>)}</select></label><button className="secondary-button" disabled={!from || !to || from === to} onClick={() => state.createBusLine(from, to)}><BusFront size={14} /> Criar linha</button><small>Custo operacional: {money(state.city.policies.freeTransit ? 1500 : 950)} / mês por linha.</small></div></div>
    <div className="bus-lines">{state.city.busLines.map((line, i) => <div key={line.id}><span><BusFront size={16} /> Linha {i + 1} · {line.from} → {line.to}</span><button aria-label={`Remover linha ${i + 1}`} onClick={() => state.removeBusLine(line.id)}><Trash2 size={15} /></button></div>)}</div></>;
}

function Policies() {
  const state = useGame(), m = getMetrics(state.city);
  return <><p className="dialog-description">Políticas alteram variáveis da simulação e permanecem no save. O orçamento considera seu custo mensal e os efeitos sobre receita e consumo.</p><div className="policy-list">{(Object.keys(POLICY_INFO) as PolicyKind[]).map(kind => <label key={kind} className="setting-row"><span><strong>{POLICY_INFO[kind].name}</strong><small>{POLICY_INFO[kind].description}</small><em>{money(POLICY_INFO[kind].upkeep * m.population)} / mês em custo direto</em></span><input type="checkbox" checked={state.city.policies[kind]} onChange={e => state.setPolicy(kind, e.target.checked)} /><span className="switch" /></label>)}</div><div className="investment-total"><span>Custo direto de políticas</span><strong>{money(m.costs.policies)}/mês</strong></div></>;
}

function Layers() {
  const state = useGame();
  return <><p className="dialog-description">Todas as cores vêm dos dados atuais dos lotes e das rotas da cidade. Os indicadores negativos, como poluição, ficam vermelhos quando altos.</p><div className="layers-grid">{LAYERS.map(layer => <button key={layer.id} className={state.layer === layer.id ? 'selected' : ''} aria-pressed={state.layer === layer.id} onClick={() => state.setLayer(layer.id)}><span><Layers3 size={17} />{state.layer === layer.id && <Check size={15} />}</span><strong>{layer.label}</strong><small>{layer.description}</small></button>)}</div><button className="primary-button management-close" onClick={() => state.setModal(null)}>Ver a camada no mapa <Map size={16} /></button></>;
}

function Progression() {
  const state = useGame(), m = getMetrics(state.city);
  return <><div className="progress-heading"><div><small>RECORDE POPULACIONAL</small><strong>{number(state.city.peakPopulation)} habitantes</strong><p>Desbloqueios conquistados são preservados mesmo se a população diminuir.</p></div><label>Escala dos marcos<select aria-label="Escala dos marcos" value={state.city.milestoneScale} onChange={e => state.setMilestoneScale(Number(e.target.value))}><option value="0.05">Bairro rápido · 5%</option><option value="0.1">Mapa compacto · 10%</option><option value="0.25">Cidade · 25%</option><option value="1">Metropolitano · 100%</option><option value="2">Desafio · 200%</option></select></label></div><p className="small-note">O mapa compacto usa 10% dos marcos originais para uma progressão viável neste território. Comércio inicial é mantido para compatibilidade com a versão anterior. Prédios evoluem quando têm energia, água, educação, saúde, segurança e valorização suficientes.</p><div className="milestone-list">{MILESTONES.map((milestone, i) => {
    const target = Math.round(milestone.population * state.city.milestoneScale), done = state.city.peakPopulation >= target;
    return <div key={milestone.population} className={done ? 'done' : ''}><span>{done ? <Check size={17} /> : i + 1}</span><div><h3>{milestone.name} <small>{number(target)} habitantes</small></h3><p>{milestone.reward}</p><div className="coverage-track"><i style={{ width: `${Math.min(100, state.city.peakPopulation / target * 100)}%` }} /></div></div></div>;
  })}</div><div className="investment-total"><span>População atual</span><strong>{number(m.population)}</strong></div></>;
}

function Events() {
  const state = useGame(), event = state.city.event;
  return <>{event ? <section className="event-decision"><span className="eyebrow"><Sparkles size={14} /> DECISÃO DA PREFEITURA · {dateLabel(event.id)}</span><h3>{EVENT_INFO[event.kind].title}</h3><p>{EVENT_INFO[event.kind].description}</p><div>{EVENT_INFO[event.kind].options.map((option, i) => <button key={option.label} disabled={option.cost > 0 && state.city.treasury < option.cost} onClick={() => state.decideEvent(i)}><strong>{String.fromCharCode(65 + i)} · {option.label}</strong><small>{option.effect}</small></button>)}</div></section> : <div className="empty-events"><Sparkles size={26} /><h3>Nenhuma decisão pendente</h3><p>O próximo evento será avaliado no dia {Math.ceil((state.city.day + 1) / 120) * 120}. Avance a simulação para descobrir novas oportunidades e desafios.</p></div>}
    <div className="active-modifiers">{state.city.modifiers.investmentUntil > state.city.day && <span>Estímulo empresarial: +25% por mais {state.city.modifiers.investmentUntil - state.city.day} dias</span>}{state.city.modifiers.recessionUntil > state.city.day && <span>Recessão: -20% de receita empresarial por mais {state.city.modifiers.recessionUntil - state.city.day} dias</span>}{state.city.modifiers.floodUntil > state.city.day && <span>Alerta de enchente: mais {state.city.modifiers.floodUntil - state.city.day} dias</span>}</div>
    {!!state.city.eventHistory.length && <div className="event-history"><h3>Decisões anteriores</h3>{[...state.city.eventHistory].reverse().map(entry => <div key={entry.id}><span>{dateLabel(entry.id)}</span><strong>{EVENT_INFO[entry.kind].title}</strong><small>{EVENT_INFO[entry.kind].options[entry.choice!].label}</small></div>)}</div>}</>;
}

export function ManagementContent() {
  const state = useGame(), m = getMetrics(state.city);
  return <><nav className="management-tabs" aria-label="Áreas de gestão">{tabs.map(tab => <button key={tab.id} aria-pressed={state.managementTab === tab.id} className={state.managementTab === tab.id ? 'active' : ''} onClick={() => state.openManagement(tab.id)}>{tab.label}{tab.id === 'events' && state.city.event && <i />}</button>)}</nav>
    {state.managementTab === 'services' && <><div className="service-scorecard">{[['Educação', m.coverage.education], ['Saúde', m.coverage.health], ['Segurança', m.coverage.safety], ['Bombeiros', m.coverage.fire], ['Parques', m.coverage.parks]].map(([name, value]) => <span key={name}><small>{name}</small><strong>{Math.round(Number(value) * 100)}%</strong></span>)}</div><p className="small-note">Instalações ocupam 2 × 2 lotes livres e precisam de acesso à rua. O raio, a capacidade, a rede conectada e o financiamento determinam a cobertura. O atendimento regional inicial é limitado; serviços locais ampliam a qualidade de vida.</p><div className="facility-grid">{(['school', 'hospital', 'police', 'fire', 'cityhall', 'park'] as FacilityKind[]).map(kind => <FacilityCard kind={kind} key={kind} />)}</div></>}
    {state.managementTab === 'infrastructure' && <Infrastructure />}{state.managementTab === 'transport' && <Transport />}{state.managementTab === 'policies' && <Policies />}{state.managementTab === 'layers' && <Layers />}{state.managementTab === 'progression' && <Progression />}{state.managementTab === 'events' && <Events />}
  </>;
}
