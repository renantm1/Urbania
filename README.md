# URBANIA — Build Your City

Simulador urbano 3D para navegador desktop. **Versão 0.3:** trânsito, serviços públicos, infraestrutura, evolução de edifícios, políticas, eventos e transporte público integrados à economia. Modelos procedurais próprios, interface em português e salvamento local.

A [especificação original](docs/PROJECT.md) está preservada. O desenvolvimento segue os recortes por fases: a Fase 1 foi publicada inicialmente; esta versão adiciona os sistemas das Fases 2 e 3 e melhorias de desempenho e apresentação da Fase 4. Os limites desta implementação estão descritos ao final, sem tratar funcionalidades futuras como prontas.

## Executar

Requisitos: **Node.js 24**, npm e navegador desktop moderno com **WebGL 2**. Não exige backend, conta, banco remoto ou chaves de API.

```bash
npm ci
npm run dev
```

O Vite informa o endereço local. Use uma janela de pelo menos 1.024 px e um mouse. Para produção:

```bash
npm run build
npm run preview
```

Todos os modelos, ícones e sons são locais ou procedurais. Não há fontes, texturas ou modelos carregados de serviços externos. Depois de carregar a página e seus arquivos, o gameplay não precisa de rede. Não há service worker: abrir a página do zero ainda precisa do servidor.

## Começar uma cidade

1. Dê um nome e comece com **R$ 2.000.000**. O território tem 56 × 56 lotes de 8 m.
2. Escolha **Estradas**, clique no início e no fim do trecho. O alinhamento é feito pelo eixo predominante; cruzamentos se conectam automaticamente.
3. Pinte zonas **residenciais**, **comerciais** e **industriais** próximas às ruas. Edifícios privados surgem a cada três dias conforme demanda, acesso e infraestrutura. A prefeitura paga pelo zoneamento, não pelos edifícios privados.
4. Avance a simulação e equilibre moradias e empregos. As barras RCI indicam demanda por **novos lotes**. Mesmo com demanda residencial zero, casas existentes podem receber moradores se houver atratividade, serviços e empregos.
5. Use **Energia e água** para ampliar a infraestrutura. Os contratos regionais iniciais atendem 120 unidades de consumo; não sustentam uma cidade grande sozinhos.
6. Em **Serviços públicos**, instale escolas, hospital, segurança, bombeiros, prefeitura e parques. Uma instalação ocupa **2 × 2 lotes livres** e precisa de acesso à rua. O círculo de prévia mostra seu alcance.
7. Acompanhe o orçamento, as coberturas e os alertas. A rede viária precisa estar conectada: energia, serviços e empregos em outra rede isolada não resolvem os problemas do bairro.
8. Use **Marcos** para ver os desbloqueios, **Políticas** para mudar prioridades, **Mapas** para investigar lotes e **Eventos** para responder a decisões municipais.

O tempo usa meses de 30 dias, começando em janeiro de 2026. Em 1×, um segundo ativo equivale a um dia. Velocidades: 1×, 2× e 4×. Janelas, aba oculta e o botão de pausa interrompem a simulação. A câmera continua funcionando durante a pausa. Novos eventos abrem a central da prefeitura e pausam o tempo enquanto a janela está aberta; é possível fechar a janela e decidir depois.

## Controles

| Ação | Controle |
| --- | --- |
| Mover câmera | WASD ou setas |
| Zoom | Scroll |
| Girar e inclinar | Botão direito + arrastar |
| Deslocar câmera | Botão do meio + arrastar |
| Construir / selecionar | Clique esquerdo |
| Pintar zonas / demolir | Clique esquerdo + arrastar |
| Pausar / continuar | Espaço |
| Cancelar trecho, ferramenta ou janela | ESC |
| Estradas / residencial / comercial / industrial / demolição | 1 / 2 / 3 / 4 / 5 |
| Inspecionar | V |
| Recentralizar câmera | F |
| Salvar diretamente no espaço 1, substituindo seu conteúdo | Ctrl+S / Cmd+S |
| Abrir salvamentos | Ctrl+Shift+S / Cmd+Shift+S |

Ruas de bairro custam R$ 150/m; avenidas, R$ 300/m. Cada célula tem 8 m. Zonear custa R$ 120 por lote. Demolir uma via, um edifício ou uma instalação pública custa R$ 180; limpar uma zona vazia é gratuito, inclusive se o caixa estiver negativo. A demolição de qualquer célula de uma instalação remove toda a instalação e suas linhas associadas. Edifícios existentes precisam ser demolidos antes de trocar o zoneamento. Não se constrói na água, fora do mapa nem sobre construções existentes. Trocar um tipo de via cobra a diferença absoluta de custo e não gera reembolso.

## Sistemas urbanos

### Economia e população

A população é agregada por edifício. Capacidade, moradores, famílias estimadas, empregos, desemprego, satisfação e migração vêm do estado da cidade. Empregos de uma rede viária desconectada não atendem os moradores de outra. Sem água, energia ou acesso viário, edifícios perdem moradores e empregos deixam de operar.

O orçamento contém IPTU, atividades comercial e industrial **simuladas**, transferências de desenvolvimento, manutenção de ruas, contratos básicos, instalações, políticas e ônibus. Não é uma representação legal dos tributos municipais brasileiros. O saldo mensal é creditado a cada 30 dias; obras e decisões extraordinárias movimentam o caixa imediatamente. Impostos altos reduzem atratividade. Saúde, educação e bombeiros influenciam produtividade; trânsito saturado a reduz. A prefeitura melhora satisfação e eficiência administrativa.

### Infraestrutura e serviços

- **Subestação:** capacidade elétrica; **tratamento de água:** água e esgoto; **central de coleta:** lixo.
- **Escola, hospital, delegacia, bombeiros, prefeitura e parque:** coberturas e efeitos distintos sobre a cidade.
- **Financiamento de 0 a 150%:** altera capacidade, alcance e manutenção. Em 0%, a instalação deixa de atender e não despacha veículos. O financiamento das redes também afeta os contratos regionais iniciais.
- Atendimento considera acesso, componente da rede, distância, demanda e capacidade. A produção total exibida pode estar em redes diferentes; o percentual de atendimento mostra o que efetivamente chega aos lotes.
- A indústria aumenta poluição nas proximidades. Coleta insuficiente também aumenta poluição. Parques e serviços elevam o valor dos terrenos.
- Edifícios evoluem por até **três níveis**, com capacidade e arquitetura diferentes. Idade, energia, água, educação, saúde, segurança, valorização, satisfação e marcos precisam ser suficientes.

As unidades de consumo e capacidade são abstratas para balanceamento do jogo; não são kWh, litros ou toneladas medidos de uma cidade real.

### Trânsito e ônibus

Carros fazem trajetos entre moradias e empregos; caminhões ligam indústria e comércio; veículos municipais saem de instalações; ônibus ligam estações. As rotas usam **A*** nas vias reais, com cache por topologia. Demolir uma via invalida trajetos afetados. Agentes seguem faixas, fazem curvas visuais, param em semáforos alternados, mantêm distância e desaceleram sob carga. Ao terminar a viagem, o objeto volta ao pool.

São **agentes representativos**, limitados a 128, não um veículo por cidadão. Uma amostra adicional de até 24 moradores caminha nas calçadas usando trajetos residenciais reais, sem criar um objeto de simulação por habitante. A carga de tráfego deriva das viagens e da população representada; a amostra é ponderada para cidades maiores. O indicador de trânsito compara carga com capacidade por trecho. Avenidas comportam mais demanda.

Construa duas estações na mesma rede e use **Transporte** para criar uma linha. As linhas têm custo operacional e reduzem a demanda por carros nas áreas atendidas. Remover uma estação remove suas linhas. Linhas que perderem conexão deixam de transportar e de oferecer cobertura até a rede ser reparada.

### Políticas, eventos e mapas

Quatro políticas persistentes: coleta seletiva, indústria limpa, incentivo habitacional e tarifa zero. Cada uma explica seu efeito e custo na interface. Decisões de eventos alteram caixa, financiamento, políticas ou modificadores com prazo: investimento, enchente, habitação, energia e recessão. O histórico guarda as escolhas; uma decisão pendente não é sobrescrita por outro evento.

Camadas: densidade, valor do terreno, trânsito, poluição, risco de criminalidade, educação, saúde, energia e água. Cores usam dados atuais dos lotes e rotas. O risco de criminalidade é um indicador agregado de cobertura policial, não uma simulação individual de crimes.

### Progressão

Os marcos usam o recorde populacional; perder habitantes não apaga o recorde. A escala padrão de **10%** adapta os objetivos ao mapa compacto. Pode ser alterada em **Marcos**, inclusive para os valores metropolitanos originais:

| Recurso | Mapa compacto | Escala original |
| --- | ---: | ---: |
| Delegacia, bombeiros e prefeitura | 10 | 100 |
| Escola | 50 | 500 |
| Indústria nível 2 | 100 | 1.000 |
| Hospital | 250 | 2.500 |
| Estações de ônibus | 500 | 5.000 |
| Edifícios nível 3 | 1.000 | 10.000 |
| Capacidade metropolitana de redes (+50%) | 2.500 | 25.000 |

Comércio inicial continua disponível desde o começo para preservar o fluxo da versão anterior. Prédios residenciais e comerciais de nível 2 exigem o marco de escola, além da cobertura adequada.

## Salvamentos e compatibilidade

Banco IndexedDB `urbania`, store `cities`. Três espaços manuais e um autosave global atualizado a cada minuto. Trocar domínio ou porta, limpar dados ou usar navegação privada pode tornar os saves indisponíveis. Exporte JSON para ter um backup portátil.

**Saves versão 1 são lidos e migrados automaticamente para a versão 2**, preservando nome, ruas, lotes, edifícios, dinheiro, data e histórico. Os sistemas novos recebem valores iniciais; nenhuma instalação é construída ou debitada na migração. Novas cidades e novos salvamentos usam a versão 2. Financiamento, políticas, instalações, linhas, níveis e eventos ficam no save. Agentes visuais de trânsito são reconstruídos ao continuar a cidade; não são cidadãos individuais persistentes.

Importar ou carregar substitui a cidade em memória e deixa o relógio pausado. Salve uma cidade importada em um espaço para mantê-la. Ctrl+S substitui o espaço 1 diretamente; substituição e exclusão pela janela pedem confirmação. O autosave não é um arquivo permanente de todas as cidades. Se IndexedDB não funcionar, o jogo avisa e permite exportar JSON. Configurações gráficas e áudio pertencem à sessão, não ao save.

## Desempenho e apresentação

- InstancedMesh para arquitetura, vegetação, vias, instalações, veículos e sobreposições.
- Buffers de instâncias crescem em potências de dois, evitando reconstruções a cada novo objeto. Recursos de instância são liberados no descarte; geometria é compartilhada.
- Culling por lote de instâncias e LOD para detalhes de janelas na visão distante.
- Geometria arquitetônica memorizada por footprint, variante e nível; ocupação não reconstrói fachadas.
- Simulação econômica em passo fixo diário e trânsito em passos de 100 ms simulados, independentes do render.
- Cache de componentes e até 512 trajetos por topologia; sem A* por frame. Pool fixo de 128 veículos e amostra ponderada de viagens.
- Render sob demanda durante pausa, menus e tela inicial. Câmera invalida frames enquanto se move.
- **Modo de desempenho:** menos árvores decorativas, menor resolução e sombras menores.
- **Monitor opcional:** FPS, chamadas, triângulos e agentes medidos pelo renderizador. O ciclo solar dura 120 dias, com sombras e janelas emissivas. Sons opcionais de construção/eventos são sintetizados localmente.

Nesta escala não há necessidade de um Web Worker. Benchmarks de CPU não equivalem a FPS em GPU; testes de navegador usam renderização por software para CI.

## Validar

```bash
npm test
npm run build
npx playwright install chromium # uma vez, se necessário
npm run test:e2e
npm run bench
```

Playwright usa `/usr/bin/chromium` local quando disponível. É possível definir `URBANIA_CHROMIUM_PATH`. No CI, prefere Chrome/Chromium já fornecido pela imagem oficial do runner; se ausente, instala o Chromium do Playwright. Gere `dist` antes. A suíte inclui dois intervalos reais de autosave e leva alguns minutos. Falhas geram imagens e traces em `test-results/`.

Os testes cobrem construção, economia, 900 dias de simulação, persistência, migração, infraestrutura, conexões, capacidade, financiamento, evolução, emprego por rede, ônibus, tráfego, políticas e todas as escolhas dos eventos. No navegador são exercitados canvas, salvamento, importação/exportação, serviços, linhas, camadas, eventos e controles de câmera durante a pausa. O benchmark usa uma cidade com centenas de edifícios e vias para medir passos completos da lógica, não apenas leituras de cache.

## GitHub Pages

O [workflow de publicação](.github/workflows/pages.yml) roda a cada push em `main`, instala pelo lockfile, testa, gera o build, executa os fluxos no navegador e publica `dist`. Em **Settings → Pages**, a origem deve ser **GitHub Actions**. O caminho de produção é `/Urbania/`; localmente, `/` continua sendo o padrão.

```bash
VITE_BASE_PATH=/Urbania/ npm run build
VITE_BASE_PATH=/Urbania/ npm run test:e2e
VITE_BASE_PATH=/Urbania/ npm run preview
```

Endereço padrão após deploy bem-sucedido: `https://renantm1.github.io/Urbania/`. Apenas enviar um commit não comprova publicação: confira o job de deploy. Nenhum segredo adicional é necessário; usa-se o token temporário do Actions e OIDC com permissões limitadas. Para levar um save de outro endereço ao site, exporte o JSON e importe no destino.

## Arquitetura

```text
src/core/       construção, mundo, economia, serviços, tráfego, eventos e persistência
src/state/      store Zustand e comandos da sessão
src/render/     cena R3F, câmera, terreno e modelos instanciados
src/ui/         HUD, gestão municipal, formulários, áudio e formatação
tests/          fluxos Playwright no navegador
```

## Limites e expansões futuras

O território ainda é fixo. Há duas categorias de via: rua e avenida, ambas com trânsito de mão dupla. Ainda não há zona mista, vias de mão única, seis faixas, rodovias, curvas construídas pelo jogador, pontes ou compra de setores. A* usa uma grade; as curvas dos veículos são suavização visual dentro dos cruzamentos. Semáforos são simplificados e determinísticos, sem fases adaptativas ou regras completas de prioridade.

Serviços e população são agregados; não há simulação individual persistente de pedestres, transporte com passageiros individualizados, desastres físicos com fluidos ou rede elétrica/hidráulica separada das ruas. O ciclo solar é visual e não altera a demanda energética. Sons são sinais de interface, não trilha sonora. Estas limitações não são apresentadas como recursos já concluídos. Expansão de escala, novos tipos de via, simulações mais detalhadas e benchmarks em diferentes GPUs continuam como melhorias futuras.

## Ambiente na nuvem

Use `/workspace/Urbania`, o checkout já existente. Tarefas na nuvem são isoladas; não é preciso criar worktrees adicionais. Instalação reproduzível: `npm ci`, `npm test`, `npm run build`. Inicie com `npm run dev -- --port 5173 --strictPort`. Processos precisam reiniciar em novas tarefas; dependências e arquivos podem vir do snapshot. O registro npm é suficiente para reinstalar dependências; o jogo não exige credenciais.
