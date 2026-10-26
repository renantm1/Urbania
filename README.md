# URBANIA — Build Your City

City builder 3D para navegador desktop, com modelos procedurais próprios e interface em português. Este repositório implementa a **Fase 1: vertical slice jogável**, conforme a especificação. Não é uma implementação completa das quatro fases.

A especificação original está preservada em [docs/PROJECT.md](docs/PROJECT.md).

## Executar

Requisitos: **Node.js 22.12+ ou 24 LTS**, npm e navegador desktop moderno com **WebGL 2** e aceleração de hardware. Não exige backend, chaves de API, conta ou serviços externos.

```bash
npm ci
npm run dev
```

O Vite informa no terminal o endereço local. Use uma janela de pelo menos 1.024 px e um mouse. Para gerar e servir a versão de produção:

```bash
npm run build
npm run preview
```

O jogo não carrega fontes, texturas nem modelos de serviços externos. Depois de o aplicativo e seus arquivos serem carregados, a simulação não depende de rede. Não há service worker: abrir a página do zero ainda requer acesso ao servidor que a hospeda.

## Como jogar

1. Dê um nome à cidade e escolha **Começar a construir**. O território começa vazio, com R$ 2.000.000.
2. Escolha **Estradas**. Clique no ponto inicial e depois no final. O trecho se alinha ao eixo predominante da grade. Vias que se encontram ou cruzam se conectam automaticamente.
3. Pinte zonas **residenciais** ao lado das ruas. Use zonas **comerciais** e **industriais** para criar empregos. A barra RCI mostra a demanda calculada da cidade.
4. Deixe o tempo avançar. Edifícios começam a surgir a cada três dias, conforme a demanda, e residências recebem moradores gradualmente. A construção de edifícios é privada: a prefeitura paga pelas ruas e pelo zoneamento.
5. Abra **Orçamento** para ver as receitas e despesas e ajustar a alíquota de simulação. O saldo projetado é creditado ao caixa a cada **30 dias**. Obras têm cobrança imediata.
6. Use **Inspecionar** e clique em um lote ou via para consultar seus dados. Sem acesso viário, um lote não se desenvolve; residências existentes perdem moradores.
7. Salve em um dos três espaços locais ou exporte um JSON. O autosave usa um quarto espaço, substituído a cada minuto pela cidade atual.

Zonear longe de ruas é permitido, mas esses lotes ficam aguardando acesso viário. Não é possível construir na água, fora do mapa ou sobre um edifício. Demolir uma zona sem edifício é gratuito; remover uma via ou edifício custa R$ 180 por célula. A demolição remove o lote inteiro, incluindo seu zoneamento. Trocar um tipo de via cobra a diferença absoluta de custo e não gera reembolso.

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
| Cancelar trecho / ferramenta / fechar janela | ESC |
| Rua / residencial / comercial / industrial / demolir | 1 / 2 / 3 / 4 / 5 |
| Inspecionar | V |
| Recentralizar câmera | F |
| Salvar diretamente no espaço 1 (substitui o conteúdo) | Ctrl+S / Cmd+S |
| Abrir salvamentos | Ctrl+Shift+S / Cmd+Shift+S |

O relógio usa meses de 30 dias, começando em janeiro de 2026. Em 1×, cada segundo ativo corresponde a um dia. A simulação pausa ao abrir janelas, ocultar a aba ou usar o botão de pausa. A velocidade pode ser 1×, 2× ou 4×. A câmera continua livre enquanto o tempo está pausado.

## Sistemas implementados

- Território de 56 × 56 lotes de 8 m; terreno, rio, lago, árvores e relevo nas bordas.
- Câmera orbital suave, deslocamento relativo à direção da câmera, limites de zoom e inclinação.
- Ruas de duas faixas e avenidas de quatro faixas, prévia de custo, calçadas, faixas e cruzamentos. Cada célula integra um grafo real, com algoritmo A* testado. Veículos não são renderizados nesta fase.
- Pincéis 1×1, 3×3 e 5×5 para três tipos de zoneamento e demolição.
- Casas e sobrados, lojas e galpões com fachadas, portas, janelas e telhados próprios. Instâncias compartilhadas para partes arquitetônicas, árvores, vias e lotes.
- Crescimento por demanda, capacidade por edifício, população, famílias estimadas, empregos, desemprego e satisfação agregada.
- Impostos simulados, transferências de desenvolvimento, manutenção, administração e serviços básicos agregados. O orçamento identifica a natureza simplificada dessas receitas.
- Objetivos iniciais, inspeção de lotes, estatísticas com histórico mensal real, orçamento e configurações gráficas.
- IndexedDB com três espaços manuais, autosave, nova cidade, retomada, importação e exportação JSON. Saves versão 1 têm validação de limites, tipos, ocupação, geometria, sobreposição e histórico.
- Arquitetura de simulação independente do render, passo fixo e resultados determinísticos para a mesma cidade e sequência de ações.

## Salvamentos

Dados ficam no banco IndexedDB `urbania`, store `cities`, na origem do navegador. Trocar domínio ou porta, usar modo privado ou limpar dados do site pode tornar os saves indisponíveis. Exporte JSON para fazer backup. Importar ou carregar substitui a cidade em memória e deixa o relógio pausado; use um espaço manual para guardar uma cidade importada. O autosave é global, não um backup permanente de todas as cidades. Configurações gráficas são locais à sessão e não fazem parte do save da cidade.

O atalho Ctrl+S / Cmd+S é um salvamento rápido e substitui o espaço 1. Na janela de salvamentos, substituir ou excluir um espaço exige confirmação na própria interface. Se o navegador impedir o uso de IndexedDB, o jogo avisa e a exportação JSON permanece disponível.

## Validar

```bash
npm test
npm run build
# Instale Chromium uma vez, caso o sistema ainda não o tenha:
npx playwright install chromium
npm run test:e2e
```

Os testes de navegador usam `/usr/bin/chromium` quando disponível. É possível indicar outro executável com `URBANIA_CHROMIUM_PATH`. Em outros sistemas, o Playwright usa seu próprio Chromium. O runner serve `dist` na porta 4173; gere o build antes. Os testes usam renderização por software para funcionar em CI sem GPU; isso não equivale a um benchmark do desempenho em uma GPU real.

- Testes de regras: cobrança atômica, terreno válido, limites, sobreposição, upgrade de vias, conexão de cruzamentos, A*, desconexão por demolição, demanda, migração, imposto e fechamento mensal.
- Simulação prolongada: 900 dias ativos, equivalentes a 15 minutos em 1× no modelo, reconciliando caixa e validando o estado final. É um teste acelerado da lógica, não uma sessão manual de 15 minutos.
- Persistência: round-trip, independência dos espaços, substituição, exclusão e rejeição de saves inválidos.
- Testes de navegador: construção real pelo canvas, zoneamento, crescimento, pausa, demolição, alíquota, salvamento, recuperação após reload e importação/exportação. O autosave é verificado com dois intervalos reais de um minuto, incluindo a desativação; a suíte leva alguns minutos. Capturas e traces de falhas ficam em `test-results/`.

## Organização

```text
src/core/       regras puras de construção, mundo, economia e simulação; IndexedDB
src/state/      store Zustand e comandos da sessão
src/render/     cena R3F, câmera, terreno e modelos instanciados
src/ui/         HUD, janelas, formulários e formatação
src/App.tsx     relógio fixo, autosave, atalhos e composição
tests/          fluxos Playwright no navegador
```

O render lê o estado, mas não executa regras econômicas. Edifícios e cidadãos são simulados de forma agregada. Não há um objeto por morador. A geometria arquitetônica é memorizada por footprint e variante; mudanças de ocupação não exigem recriar fachadas. O A* calcula sob demanda e não roda a cada frame. Nesta escala, não há carga que justifique um Web Worker. O território ainda não é expansível.

## Próximas fases

**Fase 2:** agentes de tráfego e pooling, rotas em cache, sentidos de trânsito, congestionamento, energia, água, saneamento, serviços públicos individuais e evolução dos edifícios.

**Fase 3:** eventos com decisões, políticas, camadas temáticas, transporte público, ciclo dia/noite, progressão e desbloqueios.

**Fase 4:** LOD por distância, mais otimizações de escala, áudio, acessibilidade e controles adicionais, balanceamento de longo prazo e benchmarks em diferentes GPUs.

Também ficam para depois: zona mista, rodovias, ruas de mão única, avenidas de seis faixas, curvas, pontes e expansão por setores. A iluminação desta versão é solar e estática, com sombras configuráveis. As ruas são conexões funcionais da simulação e não apenas decoração, mas a visualização de tráfego pertence à Fase 2.

## GitHub Pages

O workflow [`.github/workflows/pages.yml`](.github/workflows/pages.yml) publica o jogo a cada push na branch `main` e também permite execução manual. Em **Settings → Pages**, a origem deve ser **GitHub Actions**. O workflow instala as dependências pelo lockfile, executa os testes de regras, gera o build e executa os quatro testes no navegador antes de publicar `dist`.

O caminho de produção é `/Urbania/`, configurado por `VITE_BASE_PATH`. Assets, ícone e testes respeitam esse caminho; o desenvolvimento local continua usando `/`. Para testar exatamente esse build localmente:

```bash
VITE_BASE_PATH=/Urbania/ npm run build
VITE_BASE_PATH=/Urbania/ npm run test:e2e
VITE_BASE_PATH=/Urbania/ npm run preview
```

Após um deploy bem-sucedido, o endereço padrão é `https://renantm1.github.io/Urbania/`. O status do job de deploy é a confirmação de publicação; apenas enviar um commit não garante que o site já está no ar. Não são necessários segredos adicionais para o workflow: ele usa o token temporário do GitHub Actions, com permissões de Pages e OpenID Connect limitadas ao job de deploy.

Os saves pertencem à origem do navegador. Para levar uma cidade de outro endereço para o site publicado, exporte o JSON no endereço antigo e importe no novo.

## Ambiente na nuvem

O checkout padrão é `/workspace/Urbania`. Use o checkout existente; tarefas na nuvem já são isoladas e não precisam de um Git worktree adicional. Instalação reproduzível: `npm ci`, `npm test`, `npm run build`. Inicie o servidor com `npm run dev -- --port 5173 --strictPort`. Processos não fazem parte de snapshots; reinicie o Vite em novas tarefas quando necessário. Todos os assets são procedurais ou locais; apenas o registro npm é necessário para reinstalar dependências.
