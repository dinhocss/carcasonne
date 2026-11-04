# Relatório Técnico: Implementação de Padrões GRASP e GoF no Carcassonne

Este documento descreve detalhadamente as modificações arquiteturais e de código realizadas no projeto **Carcassonne**, em conformidade com o novo modelo UML contido em `design_documents/Diagrama_de_Classes (Modificação Padrões GRASP e GoF).mdj` e as diretrizes do `Relatório Técnico de Arquitetura.pdf`.

---

## 1. Visão Geral das Modificações

O objetivo principal da reformulação foi elevar o nível de maturidade do projeto, reduzindo o acoplamento entre a camada de apresentação (View/React) e a lógica de domínio, além de aplicar princípios consolidados de **GRASP** (*General Responsibility Assignment Software Patterns*) e padrões de projeto **GoF** (*Gang of Four*).

### Quadro Resumo das Modificações

| Padrão | Categoria | Elementos Afetados | O que foi exigido | Por que foi exigido (Motivação) |
| :--- | :--- | :--- | :--- | :--- |
| **Facade** | GoF (Estrutural) | `CarcasonneFacade` | Criação de uma fachada unificada contendo `iniciarNovaPartida()`, `realizarJogada()`, `passarTurno()` e agregação de `GameManager`, `TabuleiroManager` e `TileManager`. | Isolar o front-end dos detalhes internos do domínio, oferecendo uma API simples e coesa para eventos do usuário. |
| **Controller** | GRASP | `CarcasonneFacade`, `GameManager` | Delegação de eventos externos da UI para a `CarcasonneFacade` e orquestração do fluxo de turnos pelo `GameManager`. | Manter a camada visual puramente reativa e concentrar o controle da partida em controladores especializados. |
| **Singleton** | GoF (Criacional) | `GameManager`, `TabuleiroManager` | Construtor privado, atributo estático privado `-instance` e método público estático `+getInstance()`. | Garantir a unicidade de estado da partida e do tabuleiro, impedindo que instâncias conflitantes existam simultaneamente. |
| **Strategy** | GoF (Comportamental) | `IA`, `EstrategiaIA` | Interface `EstrategiaIA` e implementações concretas (`EstrategiaIAPrimeiraValida`, `EstrategiaIAAgressiva`, `EstrategiaIADefensiva`) acopladas à `IA`. | Permitir a substituição de algoritmos de tomada de decisão da IA em tempo de execução, cumprindo o princípio Aberto/Fechado (OCP). |
| **Creator** | GRASP | `Participante`, `TileManager`, `TabuleiroManager` | `Participante` instancia seus 7 `Meeple`s; `TileManager` instancia as 72 peças do catálogo; `TabuleiroManager` cria e emite `ColocacaoInvalidaException`. | Atribuir a responsabilidade de criação para quem possui o ciclo de vida, agrega ou utiliza diretamente os objetos criados. |
| **Information Expert** | GRASP | `Tile`, `Meeple`, `Tabuleiro`, `Participante` | `Tile` rotaciona a si mesmo e gerencia meeples locais; `Meeple` define sua classificação ao receber o tipo de terreno; `Tabuleiro` consulta adjacências; `Participante` gerencia pontos e meeples. | Colocar os métodos nas classes que efetivamente possuem os dados necessários para executá-los, garantindo alta coesão. |

---

## 2. Detalhamento dos Padrões GRASP

### 2.1. Padrão Controller
* **O que foi implementado**:
  - `CarcasonneFacade`: Funciona como o controlador principal de primeiro nível recebendo eventos da interface gráfica (`iniciarNovaPartida()`, `realizarJogada()`, `passarTurno()`).
  - `GameManager`: Funciona como o controlador do fluxo interno do jogo (fases do turno: compra de peça, posicionamento de tile, posicionamento de meeple, finalização e pontuação).
* **Por que foi implementado**:
  - Anteriormente, o componente visual `App.tsx` invocava diretamente rotinas dispersas de múltiplos gerenciadores e alterava estados de baixo nível.
  - Com o Controller, desacoplou-se a apresentação visual da lógica de domínio. Qualquer mudança futura na interface gráfica (ou adição de CLI / bots remotos) não impactará a máquina de regras do Carcassonne.

### 2.2. Padrão Information Expert (Especialista na Informação)
* **O que foi implementado**:
  - **Tile**: Detém o conhecimento de suas 4 bordas e 13 subsegmentos. O método `rotacionar()` atualiza internamente a orientação das bordas (sentido horário) e o rearranjo dos subsegmentos. Possui os métodos `posicionarMeeple()`, `removerMeeple()`, `obterMeeple()` e `obterTipoSubsegmento()`.
  - **Meeple**: Conhece seu estado de alocação e determina a própria classificação através de `definirClassificacao(terreno: TipoTerreno)`:
    - `CIDADE` $\rightarrow$ `CAVALEIRO`
    - `ESTRADA` $\rightarrow$ `LADRAO`
    - `MOSTEIRO` $\rightarrow$ `MONGE`
    - `CAMPO` $\rightarrow$ `FAZENDEIRO`
  - **Tabuleiro**: Possui a matriz bidimensional de tiles e responde diretamente a consultas sobre o tabuleiro através de `obterTile(x, y)`, `posicionarTile(tile, x, y)`, `obterTilesAdjacentes(x, y)` e `estaVazio(x, y)`.
  - **Participante**: Gerencia seu saldo de pontos (`adicionarPontos`), disponibilidade dos seus meeples (`temMeepleDisponivel`, `pegarMeeple`, `devolverMeeple`) e status de atividade (`marcarComoDesistente`, `estaAtivo`).
* **Por que foi implementado**:
  - Evita classes anêmicas onde uma classe gerencia dados de outra sem autoridade, aumentando a coesão e reduzindo o acoplamento funcional.

### 2.3. Padrão Creator (Criador)
* **O que foi implementado**:
  - **Participante**: Composição forte com `Meeple`. No método privado `inicializarMeeples()`, o participante instancia sua coleção inicial de 7 objetos `Meeple(this)`. Se o jogador desiste, seus meeples são automaticamente desalocados.
  - **TileManager**: Agrega o catálogo de peças e instancia as 72 peças físicas do jogo em `inicializarBaralho()`.
  - **TabuleiroManager**: Atua como criador da nova classe de exceção `ColocacaoInvalidaException`, disparando-a quando regras espaciais ou de conexão de bordas são violadas (`exigirPosicaoTileValida` e `exigirPosicaoMeepleValida`).
* **Por que foi implementado**:
  - Atribui a criação a entidades que mantêm associação estrutural ou ciclo de vida dependente (princípio do todo-parte e agregação direta).

---

## 3. Detalhamento dos Padrões GoF

### 3.1. GoF Facade (Estrutural)
* **O que foi implementado**:
  - Classe `CarcasonneFacade` (com alias `CarcassonneFacade`), agregando `gameManager: GameManager`, `tabuleiroManager: TabuleiroManager` e `tileManager: TileManager`.
  - Expõe as operações essenciais solicitadas no modelo:
    - `iniciarNovaPartida(nomesJogadores: string[]): void`
    - `realizarJogada(x: number, y: number, rotacao: number, idSubsegmentoMeeple: number): boolean`
    - `passarTurno(): void`
    - Métodos convenientes de leitura para a camada visual (`obterTabuleiro()`, `obterParticipantes()`, `obterTileAtual()`, etc.).
* **Por que foi implementado**:
  - O subsistema do Carcassonne possui regras complexas de validação, pontuação e fases de turno divididas entre três gerenciadores distintos. Sem a Facade, o front-end precisaria conhecer as nuances de cada subsistema. A Facade unifica e simplifica essa fronteira.

### 3.2. GoF Singleton (Criacional)
* **O que foi implementado**:
  - `GameManager`:
    - Construtor privado: `private constructor()`.
    - Atributo estático: `private static instance: GameManager | null = null`.
    - Método de acesso global: `public static getInstance(): GameManager`.
  - `TabuleiroManager`:
    - Construtor privado: `private constructor()`.
    - Atributo estático: `private static instance: TabuleiroManager | null = null`.
    - Método de acesso global: `public static getInstance(): TabuleiroManager`.
    - Método `reiniciar()` para limpar e preparar uma nova partida sem perder a unicidade da instância.
* **Por que foi implementado**:
  - Previne estados divergentes na matriz de peças e no controle do turno. No código legado, `new TabuleiroManager(tabuleiro)` era invocado dentro de `GameManager`, quebrando o isolamento e permitindo que instâncias distintas do tabuleiro fossem criadas inadvertidamente.

### 3.3. GoF Strategy (Comportamental)
* **O que foi implementado**:
  - Interface `EstrategiaIA` definindo o contrato:
    - `escolherPosicao(tile: Tile, tabuleiroManager: TabuleiroManager): Posicao | null`
    - `decidirMeeple(tile: Tile, tabuleiroManager: TabuleiroManager): boolean`
    - `escolherSubsegmentoMeeple(tile: Tile, tabuleiroManager: TabuleiroManager): number | null`
  - Implementações concretas de estratégias:
    1. **`EstrategiaIAPrimeiraValida` (Fácil / Padrão)**: Busca a primeira posição válida no tabuleiro e aloca meeple no primeiro subsegmento elegível.
    2. **`EstrategiaIAAgressiva` (Agressiva / Ofensiva)**: Prioriza posições adjacentes a cidades e peças com emblema/escudo, visando a maximização do retorno de pontos imediatos.
    3. **`EstrategiaIADefensiva` (Defensiva)**: Prioriza fechamentos rápidos de estradas e mosteiros, além de economizar meeples.
  - A classe `IA` compõe uma referência `estrategia: EstrategiaIA` e delega as decisões de jogada via `ia.decidirJogada(tile, tabuleiroManager)`. O método `ia.definirEstrategia(novaEstrategia)` permite a troca do algoritmo em tempo de execução.
* **Por que foi implementado**:
  - Atende diretamente ao princípio Aberto/Fechado (OCP - *Open/Closed Principle*). Novos algoritmos de inteligência artificial (heurísticas gulosas, Minimax, Monte Carlo Tree Search) podem ser introduzidos sem alterar uma única linha da classe `IA`.

---

## 4. Novas Classes e Estruturas de Domínio

1. **`ColocacaoInvalidaException`** (`src/models/ColocacaoInvalidaException.ts`):
   - Exceção customizada estendendo `Error`, encapsulando a mensagem de erro específica (`obterMensagem()`).
2. **Entidades Estruturais de Terreno** (`src/models/Features.ts`):
   - `Cidade` (com atributo `temEscudo: boolean` e relação com tiles).
   - `Estrada` (gerenciamento de trechos conectados).
   - `Mosteiro` (referência ao tile e adjacências 3x3).
   - `Campo` (com operação `cidadesAdjacentesCompletas(): number`).
3. **Módulo Central de Exportação** (`src/models/index.ts`):
   - Ponto único de exportação dos modelos, facilitando manutenções e importações limpas.

---

## 5. Atualização da Interface do Usuário (`src/App.tsx`)

A interface foi refatorada para adotar a nova arquitetura:
- **Acoplamento Exclusivo com a Facade**: Em vez de invocar `GameManager` diretamente, o componente consome exclusivamente `CarcasonneFacade`.
- **Seletor de Estratégia de IA em Tempo Real**: Adicionado um controle visual que permite ao usuário escolher entre a estratégia *Fácil*, *Agressiva* ou *Defensiva* ao jogar contra a IA, demonstrando o padrão GoF Strategy em execução na interface.
- **Tratamento de Desistência e Fim de Jogo**: Interface exibe o status de desistência de participantes (`removerParticipante`) e o painel de encerramento com o(s) vencedor(es) calculados pela regra oficial do Carcassonne.

---

## 6. Validação e Testes Automatizados

Foi desenvolvido e executado com sucesso um conjunto de testes cobrindo todas as exigências do modelo:
1. **Singleton**: Verificação de identidade estrita (`===`) para `GameManager.getInstance()` e `TabuleiroManager.getInstance()`.
2. **Facade & Controller**: Inicialização de partida, compra e rotação de tiles, avanço e passagem de turnos via fachada.
3. **Creator & Exceções**: Verificação do lançamento de `ColocacaoInvalidaException` pelo `TabuleiroManager`.
4. **Information Expert**: Alocação, classificação automática do Meeple (`CAVALEIRO`, `LADRAO`, `MONGE`, `FAZENDEIRO`) e devolução.
5. **Strategy**: Execução e troca dinâmica em tempo de execução das 3 estratégias de IA.
6. **Desistência e Fim de Partida**: Marcação de desistente, verificação de encerramento e determinação de vencedores.

**Resultado dos Testes**: **26/26 testes aprovados com 100% de sucesso**.

