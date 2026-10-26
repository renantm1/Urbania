import type { City, EventRecord } from './types';
import { hash } from './world';

export const EVENT_INFO: Record<EventRecord['kind'], { title: string; description: string; options: { label: string; effect: string; cost: number }[] }> = {
  investment: { title: 'Um novo polo de oportunidades', description: 'Um grupo privado quer investir na economia local. Como a prefeitura deve responder?', options: [
    { label: 'Conceder incentivo fiscal', effect: 'R$ 30 mil agora; demanda e receita empresarial +25% por 90 dias.', cost: 30_000 },
    { label: 'Exigir contrapartida', effect: 'Receba R$ 60 mil para obras, sem bônus de atividade.', cost: -60_000 },
    { label: 'Recusar o investimento', effect: 'Preserva o caixa e as condições atuais.', cost: 0 },
  ] },
  flood: { title: 'Chuvas fortes a caminho', description: 'A previsão aponta risco de enchente nos lotes próximos ao rio. Escolha a resposta municipal.', options: [
    { label: 'Proteger as margens', effect: 'R$ 25 mil; evita os efeitos desta enchente.', cost: 25_000 },
    { label: 'Mobilizar uma resposta', effect: 'R$ 8 mil; reduz o período de impacto para 10 dias.', cost: 8_000 },
    { label: 'Manter o orçamento', effect: '30 dias de demanda energética +20%; moradores próximos ao rio deixam suas casas.', cost: 0 },
  ] },
  housing: { title: 'Moradia em discussão', description: 'Novas famílias procuram um lugar na cidade. A prefeitura pode incentivar a expansão residencial.', options: [
    { label: 'Subsidiar novas moradias', effect: 'R$ 45 mil e ativa a política de incentivo habitacional, com custo mensal.', cost: 45_000 },
    { label: 'Firmar parceria privada', effect: 'Receba R$ 25 mil e 45 dias de estímulo empresarial.', cost: -25_000 },
    { label: 'Seguir o planejamento', effect: 'Mantém a demanda e as políticas atuais.', cost: 0 },
  ] },
  energy: { title: 'O futuro da rede elétrica', description: 'O crescimento exige uma decisão sobre o financiamento da rede. Instalações desconectadas não ajudarão a cidade.', options: [
    { label: 'Ampliar financiamento', effect: 'R$ 20 mil e energia em 150%; capacidade e manutenção aumentam.', cost: 20_000 },
    { label: 'Financiar com moderação', effect: 'Energia em 100%, sem investimento extraordinário.', cost: 0 },
    { label: 'Reduzir despesas', effect: 'Energia em 60%; reduz capacidade e manutenção.', cost: 0 },
  ] },
  recession: { title: 'Atividade econômica em queda', description: 'Uma desaceleração regional ameaça as receitas empresariais. Uma resposta agora pode proteger o orçamento.', options: [
    { label: 'Aceitar ajuda emergencial', effect: 'Receba R$ 40 mil; receita empresarial -20% por 60 dias.', cost: -40_000 },
    { label: 'Financiar a recuperação', effect: 'R$ 35 mil; evita a queda de arrecadação.', cost: 35_000 },
    { label: 'Aguardar a retomada', effect: 'Sem gasto imediato; receita empresarial -20% por 90 dias.', cost: 0 },
  ] },
};
export function nextEvent(city: City): EventRecord {
  const kinds = Object.keys(EVENT_INFO) as EventRecord['kind'][];
  return { id: city.day, kind: kinds[Math.floor(hash(city.day, city.seed, 78) * kinds.length)] };
}
export function resolveEvent(city: City, choice: number): City {
  if (!city.event || !Number.isInteger(choice) || choice < 0 || choice > 2) throw new Error('Escolha uma resposta válida para o evento atual.');
  const event = city.event, option = EVENT_INFO[event.kind].options[choice];
  if (option.cost > 0 && city.treasury < option.cost) throw new Error('O caixa não permite financiar esta resposta.');
  const next = { ...city, treasury: city.treasury - option.cost, event: null, eventHistory: [...city.eventHistory, { ...event, choice }].slice(-20), modifiers: { ...city.modifiers }, policies: { ...city.policies }, funding: { ...city.funding } };
  if (event.kind === 'investment' && choice === 0) next.modifiers.investmentUntil = city.day + 90;
  if (event.kind === 'housing' && choice === 0) next.policies.housing = true;
  if (event.kind === 'housing' && choice === 1) next.modifiers.investmentUntil = city.day + 45;
  if (event.kind === 'flood') next.modifiers.floodUntil = choice === 0 ? 0 : city.day + (choice === 1 ? 10 : 30);
  if (event.kind === 'energy') next.funding.power = choice === 0 ? 150 : choice === 1 ? 100 : 60;
  if (event.kind === 'recession') next.modifiers.recessionUntil = choice === 1 ? 0 : city.day + (choice === 0 ? 60 : 90);
  return next;
}
