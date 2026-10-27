import { useState } from 'react';
import { Check, ChevronDown, ChevronRight, X } from 'lucide-react';
import { useGame } from '../state/store';
import { getMetrics } from '../core/simulation';
import { hasHomes } from '../core/zoning';
import { hasRoadAccess } from '../core/world';

export function StarterGuide() {
  const city = useGame(s => s.city), visible = useGame(s => s.showGuide);
  const [expanded, setExpanded] = useState(true);
  if (!visible) return null;
  const metrics = getMetrics(city), roads = Object.keys(city.roads).length;
  const homes = Object.values(city.lots).filter(l => hasHomes(l) && hasRoadAccess(l, city.roads)).length;
  const goals = [
    { done: roads >= 5, label: 'Construa 40 m de ruas', value: `${Math.min(roads * 8, 40)}/40 m`, title: 'Tudo começa com uma rua.', tip: 'Clique no início e no fim de um trecho de pelo menos cinco lotes.', action: 'Desenhar uma rua', run: () => useGame.getState().setTool('road') },
    { done: homes >= 4, label: 'Zoneie 4 moradias com acesso', value: `${Math.min(homes, 4)}/4`, title: 'Abra espaço para morar.', tip: 'Pinte quatro lotes ao lado das ruas. Zonas residenciais e mistas contam.', action: 'Zonear moradias', run: () => useGame.getState().setTool('residential') },
    { done: metrics.jobs >= 4, label: 'Ofereça 4 empregos', value: `${Math.min(metrics.jobs, 4)}/4`, title: 'Um bairro precisa de trabalho.', tip: 'Pinte comércio ou zona mista junto às ruas e avance o tempo para os edifícios surgirem.', action: 'Zonear comércio', run: () => useGame.getState().setTool('commercial') },
    { done: metrics.population >= 10, label: 'Receba 10 moradores', value: `${Math.min(metrics.population, 10)}/10`, title: 'Espere as primeiras mudanças.', tip: 'Avance a simulação. Sem água ou energia, use Energia e água para ampliar a capacidade.', action: 'Avançar a simulação', run: () => useGame.getState().setSpeed(1) },
    { done: city.history.length > 0, label: 'Feche o primeiro mês', value: `${Math.min(city.day, 30)}/30 dias`, title: 'Acompanhe seu primeiro mês.', tip: 'O saldo mensal entra no caixa a cada 30 dias. Confira a projeção no orçamento antes de expandir.', action: 'Consultar orçamento', run: () => useGame.getState().setModal('budget') },
  ];
  const next = goals.find(g => !g.done), completed = goals.filter(g => g.done).length;
  return <section className={`objective-card panel ${!next ? 'complete' : ''}`} aria-label="Guia de primeiros passos">
    <div className="guide-heading"><button className="section-toggle" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}><span className="eyebrow"><span className="live-dot" />{next ? 'PRIMEIROS PASSOS' : 'PRIMEIRO BAIRRO CONCLUÍDO'}</span><ChevronDown size={14} className={!expanded ? 'flipped' : ''} /></button><button aria-label="Ocultar guia de primeiros passos" onClick={() => useGame.getState().setSetting('showGuide', false)}><X size={13} /></button></div>
    {expanded && <><h2 data-testid="guide-current">{next?.title ?? 'Sua cidade está viva.'}</h2><p>{next?.tip ?? 'Amplie as redes e os serviços, acompanhe os marcos e mantenha o orçamento equilibrado.'}</p><div className="objective-list">{goals.map((g, i) => <div key={g.label} className={g.done ? 'done' : ''}><span className="step-indicator">{g.done ? <Check size={11} /> : i + 1}</span><span>{g.label}</span><small>{g.value}</small></div>)}</div><div className="objective-progress" role="progressbar" aria-label="Primeiros passos concluídos" aria-valuemin={0} aria-valuemax={5} aria-valuenow={completed}><span style={{ width: `${completed / goals.length * 100}%` }} /></div>{next && <button className="text-button guide-action" onClick={next.run}>{next.action}<ChevronRight size={13} /></button>}</>}
  </section>;
}
