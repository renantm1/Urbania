# PROJETO: URBANIA — Simulador de Cidades 3D para Navegador

Você é uma equipe sênior de desenvolvimento de jogos, composta por engenheiros de gameplay, especialistas em Three.js, designers de interface, arquitetos de software e especialistas em simulação urbana.

Sua missão é **DESENVOLVER UM JOGO REAL, FUNCIONAL E JOGÁVEL**, inspirado nas mecânicas de Cities: Skylines, SimCity e Cities XL, mas com identidade visual própria.

O jogo será chamado **URBANIA — Build Your City**.

Não quero apenas um protótipo visual, uma landing page ou um dashboard. Quero um city builder com mundo 3D interativo, construção livre, ruas conectadas, edifícios, veículos, moradores e economia simulada.

O jogo deve rodar no navegador de desktop.

## 1. STACK TECNOLÓGICA

Utilize:

- React + TypeScript + Vite
- Three.js com React Three Fiber
- @react-three/drei
- Zustand para gerenciamento de estado
- Tailwind CSS para interface
- IndexedDB para salvamento local
- InstancedMesh para renderização eficiente
- Web Workers quando necessário para cálculos pesados
- Algoritmos de pathfinding A* para deslocamentos

Separe claramente os sistemas de renderização, simulação, interface, construção e persistência.

A simulação deve funcionar independentemente da taxa de quadros.

## 2. MUNDO 3D

Crie um mapa tridimensional navegável com:

- Terreno verde e relevo suave
- Rios e lagos
- Árvores distribuídas pelo mapa
- Áreas planas e elevações
- Malha de ruas construída pelo jogador
- Edifícios tridimensionais
- Veículos em movimento
- Iluminação solar dinâmica
- Sombras em tempo real
- Ciclo de dia e noite
- Céu e atmosfera
- Visualização aérea e aproximada

O estilo visual deve ser semelhante ao de um city builder moderno, com geometria estilizada, materiais de boa qualidade, cores naturais e escala coerente.

Não utilize cubos coloridos genéricos como representação final dos edifícios.

Crie modelos procedurais com fachadas, janelas, telhados, portas, detalhes arquitetônicos e variações visuais.

Priorize um mapa inicial de tamanho moderado, expansível por setores.

## 3. CÂMERA E CONTROLES

Implemente câmera 3D estilo Cities: Skylines.

Controles:

- WASD: movimentar câmera
- Scroll: zoom
- Botão direito + arrastar: rotacionar câmera
- Botão do meio + arrastar: deslocar câmera
- Clique esquerdo: selecionar ou construir
- ESC: cancelar ferramenta
- Espaço: pausar ou continuar simulação

A câmera deve possuir movimentos suaves, limites de zoom, inclinação e colisão básica com o terreno.

O jogador deve conseguir visualizar tanto a cidade inteira quanto uma rua específica.

## 4. CONSTRUÇÃO DE ESTRADAS

Este é um dos sistemas mais importantes.

Crie uma ferramenta de construção de ruas com pré-visualização em tempo real.

Tipos:

1. Rua residencial de duas faixas
2. Avenida de quatro faixas
3. Avenida de seis faixas
4. Rua de mão única
5. Rodovia

O jogador clica no ponto inicial e no ponto final para construir.

Implementar:

- Conexão automática entre ruas
- Cruzamentos funcionais
- Segmentos retos inicialmente
- Curvas suaves em uma etapa posterior
- Custo por metro de construção
- Demolição de ruas
- Atualização automática da rede viária
- Calçadas e sinalização
- Faixas de trânsito
- Semáforos nos cruzamentos apropriados

A rede de ruas deve formar um grafo navegável para os veículos.

Não permita que estradas sejam apenas elementos decorativos.

## 5. ZONEAMENTO URBANO

Implemente quatro zonas principais:

**Residencial:** casas, sobrados e prédios de apartamentos.

**Comercial:** lojas, mercados, restaurantes e escritórios.

**Industrial:** fábricas, depósitos e centros logísticos.

**Mista:** edifícios com comércio no térreo e residências nos andares superiores.

O jogador seleciona uma ferramenta e pinta lotes próximos às ruas.

Os edifícios devem surgir automaticamente conforme a demanda.

Cada lote precisa verificar:

- Acesso à rua
- Zoneamento válido
- Disponibilidade de espaço
- Demanda econômica
- Infraestrutura disponível

Os edifícios devem evoluir visualmente conforme o desenvolvimento urbano.

Exemplo: uma residência simples pode evoluir para uma casa de padrão superior quando a região tiver serviços e boa valorização.

## 6. SIMULAÇÃO POPULACIONAL

Cada edifício residencial possui capacidade de moradores.

Simule indicadores agregados:

- População total
- Famílias
- Empregos
- Desemprego
- Renda média
- Satisfação
- Migração
- Demanda habitacional
- Educação
- Saúde
- Segurança

A população deve crescer conforme a disponibilidade de moradia, empregos, serviços e qualidade de vida.

Evite criar milhares de objetos JavaScript completos para cada cidadão.

Utilize simulação agregada por edifício ou região e agentes visuais representativos.

## 7. SISTEMA DE TRÂNSITO

Crie veículos tridimensionais que realmente circulem pelas estradas.

Tipos:

- Carros particulares
- Ônibus
- Caminhões
- Veículos de serviço

Os veículos devem:

- Seguir a geometria das vias
- Respeitar o sentido do trânsito
- Fazer curvas em cruzamentos
- Calcular trajetos
- Reduzir velocidade em congestionamentos
- Desaparecer ao concluir viagens
- Ser reutilizados por meio de object pooling

Implemente um indicador de congestionamento por segmento de rua.

O tráfego deve afetar a eficiência econômica e a satisfação dos moradores.

Comece com um modelo simplificado e determinístico, expandindo depois para semáforos, filas e prioridades.

## 8. ECONOMIA MUNICIPAL

O jogador começa com R$ 2.000.000 em caixa.

Fontes de receita:

- IPTU
- Impostos sobre atividade comercial
- Impostos simulados sobre atividade industrial
- Transferências governamentais
- Tarifas de serviços municipais

Despesas:

- Construção de infraestrutura
- Manutenção de ruas
- Educação
- Saúde
- Segurança
- Transporte
- Saneamento
- Energia
- Administração

Crie um orçamento mensal com receitas, despesas, saldo e histórico.

O jogador poderá alterar alíquotas e níveis de financiamento dos serviços.

Impostos excessivos devem reduzir atratividade e crescimento.

Serviços insuficientes devem reduzir satisfação e produtividade.

Use um modelo econômico simplificado e claramente identificado como simulação, sem apresentar todas as receitas como impostos municipais reais.

## 9. EDIFÍCIOS PÚBLICOS

Permita construir:

- Escola
- Hospital
- Delegacia
- Corpo de Bombeiros
- Prefeitura
- Parque
- Estação de ônibus
- Subestação elétrica
- Estação de tratamento de água

Cada instalação possui custo de construção, manutenção mensal, capacidade e área de cobertura.

Os serviços devem afetar diretamente os indicadores da cidade.

Exemplo: um bairro distante de hospitais deve ter pior cobertura de saúde.

## 10. INFRAESTRUTURA

Simule:

**Energia:** geração, consumo, capacidade e atendimento.

**Água:** produção, consumo e cobertura.

**Esgoto:** capacidade de tratamento e cobertura.

**Lixo:** geração e capacidade de coleta.

**Mobilidade:** acessibilidade e congestionamento.

Cada sistema deve possuir indicadores, alertas e consequências.

## 11. INTERFACE PREMIUM

Quero uma interface profissional, elegante e discreta.

Referências de qualidade: Cities: Skylines, Anno 1800 e softwares modernos de gestão.

Direção visual:

- Painéis escuros em azul-grafite
- Tipografia refinada
- Ícones consistentes
- Bordas sutis
- Transparências moderadas
- Animações rápidas e naturais
- Hierarquia visual clara
- Nada de excesso de gradientes
- Nada de emojis na interface
- Nada de aparência genérica de dashboard de IA

Barra superior:

- Nome da cidade
- População
- Dinheiro
- Receita/despesa
- Satisfação
- Data
- Velocidade do jogo

Barra inferior:

- Estradas
- Zoneamento
- Eletricidade
- Água
- Serviços públicos
- Transporte
- Demolição
- Informações

Ao clicar em um edifício, abrir um painel lateral com nome, tipo, moradores ou trabalhadores, nível, consumo e satisfação.

Crie também telas de orçamento, estatísticas, políticas públicas e configurações.

## 12. CAMADAS DE INFORMAÇÃO

Implemente modos de visualização para:

- Densidade populacional
- Valor dos terrenos
- Trânsito
- Poluição
- Criminalidade
- Educação
- Saúde
- Energia
- Água

Use sobreposições de cores sem prejudicar a leitura da cidade.

Os dados apresentados devem vir da simulação real.

## 13. EVENTOS DINÂMICOS

Crie eventos que acontecem durante o jogo.

Exemplos:

- Crescimento acelerado da população
- Crise habitacional
- Falta de energia
- Desemprego elevado
- Congestionamento
- Aumento dos custos de construção
- Enchentes
- Queda de arrecadação
- Investimento privado
- Expansão industrial

Eventos devem apresentar escolhas e consequências.

Exemplo:

"Uma empresa deseja instalar um centro logístico na cidade."

Opção A: conceder incentivo fiscal.

Opção B: exigir contrapartidas de infraestrutura.

Opção C: recusar o investimento.

As decisões precisam alterar variáveis reais da simulação.

## 14. PROGRESSÃO

O jogo começa com uma cidade pequena e praticamente vazia.

Objetivo: transformar o território em uma metrópole.

Desbloqueios progressivos:

- 100 habitantes: comércio básico
- 500 habitantes: escola
- 1.000 habitantes: indústria avançada
- 2.500 habitantes: hospital
- 5.000 habitantes: transporte público
- 10.000 habitantes: edifícios de alta densidade
- 25.000 habitantes: infraestrutura metropolitana

Os marcos devem ser configuráveis e equilibrados durante testes.

## 15. SALVAMENTO

Implemente:

- Criar nova cidade
- Salvar jogo
- Carregar jogo
- Autosave
- Múltiplos slots
- Exportar save em JSON
- Importar save em JSON

Inclua versionamento dos saves e validação dos dados importados.

## 16. DESEMPENHO

O jogo precisa funcionar de maneira fluida em navegadores modernos.

Utilize:

- Instanced rendering
- Frustum culling
- Level of detail
- Object pooling
- Atualização de simulação em intervalos fixos
- Cache de trajetos
- Recalcular grafos apenas quando necessário
- Separação entre renderização e lógica

Evite cálculos de toda a população em cada frame.

Priorize estabilidade e jogabilidade antes de efeitos gráficos avançados.

## 17. PLANO DE DESENVOLVIMENTO OBRIGATÓRIO

Não tente construir todas as funcionalidades de uma vez.

**FASE 1 — Vertical slice jogável**

Entregar:

- Projeto configurado
- Terreno 3D
- Câmera funcional
- Construção e demolição de ruas
- Zoneamento residencial, comercial e industrial
- Edifícios procedurais
- Crescimento populacional básico
- Caixa municipal
- Interface funcional
- Velocidade e pausa
- Salvamento

Essa fase deve permitir jogar por pelo menos 15 minutos, construindo uma pequena cidade e observando seu crescimento.

**FASE 2 — Simulação urbana**

- Tráfego real
- Empregos
- Demanda residencial e comercial
- Impostos
- Serviços públicos
- Infraestrutura
- Evolução de edifícios

**FASE 3 — Profundidade**

- Eventos dinâmicos
- Políticas públicas
- Camadas de informação
- Transporte público
- Ciclo de dia e noite
- Progressão

**FASE 4 — Polimento**

- Otimização
- Melhorias visuais
- Animações
- Áudio
- Balanceamento
- Testes de desempenho
- Correção de bugs

## 18. REGRAS IMPORTANTES

1. Não entregue apenas telas bonitas sem funcionamento.
2. Não utilize dados fictícios estáticos nos indicadores durante o gameplay.
3. Não crie botões sem funcionalidades.
4. Todas as construções devem alterar o estado persistente do mundo.
5. Os sistemas econômicos precisam ter relações causais.
6. Não copie marcas, interface exata ou assets proprietários de Cities: Skylines.
7. Use modelos e texturas próprios ou assets com licenças adequadas.
8. Prefira sistemas pequenos e funcionais a sistemas enormes incompletos.
9. Crie testes para as regras econômicas e de construção.
10. Mantenha o projeto executável ao final de cada fase.

## 19. INSTRUÇÃO FINAL

Comece inspecionando o repositório e configurando a arquitetura necessária.

Em seguida, implemente integralmente a FASE 1.

Crie os arquivos, componentes, sistemas, estilos e configurações necessários.

Execute o projeto, rode os testes disponíveis e corrija os erros encontrados.

Não pare após criar uma documentação ou um planejamento.

Quero abrir o navegador, começar uma cidade, construir estradas, definir zonas, ver edifícios surgindo, acompanhar a população e administrar meu orçamento.

Ao terminar, explique como executar o jogo localmente, quais recursos estão funcionais e quais permanecem para as próximas fases.
