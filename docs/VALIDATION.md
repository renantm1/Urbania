# Validação da versão 0.4

Referência: ambiente de desenvolvimento em 27/10/2026, Node.js 24.19.0. As medições variam com a máquina e a carga de CPU.

## Regras e interação

As suítes cobrem construção, economia, serviços, tráfego, eventos e persistência, incluindo saves das versões 1 e 2 migrados para 3, zoneamento misto e prévias de construção. Há 58 testes de regras e 11 fluxos de navegador. O fluxo de cidade integrada usa um save de teste construído pelas mesmas funções do jogo; em seguida, o Playwright constrói instalações pelo canvas, muda financiamento, ativa política, escolhe um evento, cria estações e linha, avança o tempo, verifica evolução e salva o resultado real em IndexedDB.

Os testes de câmera verificam deslocamento, zoom e rotação na imagem renderizada, depois recentralizam e constroem uma via nas coordenadas esperadas. As verificações de autosave esperam os intervalos reais, sem substituir o relógio do navegador. Não há teste que declare o workflow pronto com zero testes executados.

```bash
npm test
VITE_BASE_PATH=/Urbania/ npm run build
VITE_BASE_PATH=/Urbania/ npm run test:e2e
```

Os fluxos novos constroem um bairro misto pelo canvas e verificam moradores, trabalhadores, arrecadação, save e recuperação após reload. Também conferem preço de pincéis parciais, aviso de instalação sem rua, guia reagindo às obras e opções recuperadas após reload. A janela de configurações recebe nomes acessíveis explícitos; Espaço ativa o botão focado e volta ao jogo sem acionar uma segunda pausa.

## Benchmark de lógica

Cenário: **696 edifícios, 691 segmentos viários**, serviços públicos e pool de até 128 agentes. Comparação na mesma máquina e cenário antes/depois dos índices de serviços e empregadores por rede. Cada coluna registra uma execução de `npm run bench`; variação entre execuções é esperada:

| Operação | Antes | Depois |
| --- | ---: | ---: |
| Um dia completo de economia, serviços e evolução | 33,67 ms | 10,89 ms |
| Recalcular indicadores e viagens em um novo estado | 35,35 ms | 11,45 ms |
| Um passo de trânsito de 100 ms simulados | 1,04 ms | 1,01 ms |

O primeiro caso reduziu o tempo médio em aproximadamente 68%; o último ficou na mesma ordem de grandeza. Os dados resumidos com amostras, mínimo, máximo e erro relativo estão em [benchmark-phase4.json](benchmark-phase4.json). A referência histórica da 0.3 era 37,40 / 37,46 / 1,12 ms, medida em outro momento. O cenário mantido para comparação usa as três zonas originais; regras e fluxos separados cobrem o uso misto.

O cenário mede estados novos e passos completos, com cache de topologia reutilizado conforme o gameplay real. O primeiro benchmark não é uma simples leitura de um indicador em cache. Os intervalos de confiança e amostras são mostrados pelo Vitest; use o resultado como referência, não como garantia para todos os computadores.

```bash
npm run bench
npm run bench -- --outputJson /tmp/urbania-benchmark.json
```

Essas medições são de CPU e não equivalem a FPS. O navegador automatizado usa Chromium com renderização por software; a taxa de quadros em uma GPU de desktop deve ser medida pelo monitor do próprio jogo. A pausa e as janelas usam render sob demanda, preservando os controles de câmera. O modo de desempenho reduz detalhes visuais sem mudar regras econômicas ou população.

## Publicação

O GitHub Actions precisa passar pelas regras, build e testes de navegador antes do deploy. O caminho `/Urbania/` é usado tanto no build publicado quanto nos testes de produção. A conclusão do job de deploy confirma a publicação; um commit ou servidor local isoladamente não a confirma. A disponibilidade da página pública depende também da rede usada para acessá-la.
