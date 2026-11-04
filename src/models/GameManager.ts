import { Participante, Jogador, IA, type EstrategiaIA } from './Participante';
import { TileManager } from './TileManager';
import { TabuleiroManager } from './TabuleiroManager';
import { Tabuleiro } from './Tabuleiro';
import type { Tile } from './Tile';

export interface IGameObserver {
    aoAtualizarJogo(): void;
}

export type FaseDoTurno =
    | 'COMPRAR_TILE'
    | 'POSICIONAR_TILE'
    | 'POSICIONAR_MEEPLE'
    | 'ALOCAR_MEEPLE'
    | 'FINALIZAR_TURNO'
    | 'FIM_DE_JOGO';

/**
 * GameManager (GRASP Controller & GoF Singleton):
 * Centraliza o gerenciamento do fluxo do jogo e orquestra a alternância dos turnos.
 * Construtor privado e ponto de acesso global estático através de getInstance().
 */
export class GameManager {
    private atrasoEntreAcoesIA = 700;
    private static instance: GameManager | null = null;
    private observadores: IGameObserver[] = [];

    private participantes: Participante[] = [];
    private jogadorAtual: Participante;
    private indiceJogadorAtual: number = 0;
    private partidaFinalizada: boolean = false;
    private partidaSomenteIA: boolean = false;
    private partidaPausada: boolean = false;

    private tileManager: TileManager;
    private tabuleiroManager: TabuleiroManager;

    private ultimoTilePosicionado: Tile | null = null;
    private faseAtual: FaseDoTurno = 'COMPRAR_TILE';
    private mensagemStatus: string = 'Bem-vindo ao Carcassonne!';

    /**
     * Construtor privado (GoF Singleton).
     */
    private constructor() {
        this.tabuleiroManager = TabuleiroManager.getInstance();
        this.tileManager = new TileManager();

        this.participantes = [
            new Jogador('Jogador 1 (Você)', '#4CAF50'),
            new Jogador('Jogador 2', '#2196F3')
        ];
        this.jogadorAtual = this.participantes[0];
    }

    /**
     * Ponto de acesso global estático (GoF Singleton).
     */
    public static getInstance(): GameManager {
        if (!GameManager.instance) {
            GameManager.instance = new GameManager();
        }
        return GameManager.instance;
    }

    public adicionarObservador(obs: IGameObserver): void {
        if (!this.observadores.includes(obs)) {
            this.observadores.push(obs);
        }
    }

    public removerObservador(obs: IGameObserver): void {
        this.observadores = this.observadores.filter((o) => o !== obs);
    }

    private notificarObservadores(): void {
        for (const obs of this.observadores) {
            obs.aoAtualizarJogo();
        }
    }

    /**
     * Inicia uma nova partida configurando participantes, reiniciando o tabuleiro Singleton e o baralho.
     */
    public iniciarPartida(comIA: boolean = false, nomesJogadores?: string[]): void {
        this.tabuleiroManager.reiniciar();
        this.tileManager = new TileManager();
        this.partidaFinalizada = false;
        this.partidaSomenteIA = false;
        this.partidaPausada = false;

        const nome1 = nomesJogadores && nomesJogadores[0] ? nomesJogadores[0] : 'Jogador 1';
        const nome2 = nomesJogadores && nomesJogadores[1] ? nomesJogadores[1] : (comIA ? 'Bot Carcassonne (IA)' : 'Jogador 2');

        this.participantes = [
            new Jogador(nome1, '#4CAF50'),
            comIA ? new IA(nome2, '#FF9800') : new Jogador(nome2, '#2196F3')
        ];

        // Suporta mais jogadores se informados na lista
        if (nomesJogadores && nomesJogadores.length > 2) {
            const cores = ['#E91E63', '#9C27B0', '#00BCD4', '#FF5722'];
            for (let i = 2; i < nomesJogadores.length; i++) {
                this.participantes.push(new Jogador(nomesJogadores[i], cores[(i - 2) % cores.length]));
            }
        }

        this.indiceJogadorAtual = 0;
        this.jogadorAtual = this.participantes[0];
        this.ultimoTilePosicionado = null;

        // Peça inicial posicionada no centro do tabuleiro (5, 5)
        const pecaInicial = this.tileManager.retirarPecaInicial();
        if (pecaInicial) {
            this.tabuleiroManager.obterTabuleiro().posicionarTile(pecaInicial, 5, 5);
        }

        this.faseAtual = 'COMPRAR_TILE';
        this.mensagemStatus = `Partida iniciada! Vez de ${this.jogadorAtual.obterNome()} comprar uma peça.`;
        this.notificarObservadores();
    }

    public iniciarPartidaConfigurada(
        configuracoes: { nome: string; tipo: 'JOGADOR' | 'IA'; estrategia?: EstrategiaIA }[]
    ): void {
        if (configuracoes.length < 2) return;
        this.iniciarPartida(false, configuracoes.map((p) => p.nome));
        const cores = ['#4CAF50', '#2196F3', '#E91E63', '#9C27B0', '#00BCD4', '#FF5722'];
        this.participantes = configuracoes.map((p, i) => p.tipo === 'IA'
            ? new IA(p.nome, cores[i % cores.length], p.estrategia)
            : new Jogador(p.nome, cores[i % cores.length]));
        this.indiceJogadorAtual = 0;
        this.jogadorAtual = this.participantes[0];
        this.partidaSomenteIA = this.participantes.every((p) => p.ehAutomatico());
        this.partidaPausada = false;
        this.mensagemStatus = `Partida iniciada! Vez de ${this.jogadorAtual.obterNome()}.`;
        this.notificarObservadores();
    }

    /**
     * Inicia uma partida entre duas IAs. Os turnos são executados um a um por
     * executarTurnoIA(), para que a interface consiga mostrar cada jogada.
     */
    public iniciarPartidaIAContraIA(
        nomes: [string, string],
        estrategias: [EstrategiaIA, EstrategiaIA]
    ): void {
        this.iniciarPartida(true, nomes);

        this.participantes = [
            new IA(nomes[0], '#4CAF50', estrategias[0]),
            new IA(nomes[1], '#FF9800', estrategias[1])
        ];
        this.jogadorAtual = this.participantes[0];
        this.partidaSomenteIA = true;
        this.notificarObservadores();
    }

    /**
     * Executa o turno da IA atual em uma partida entre IAs.
     */
    public executarTurnoIA(): void {
        if (!this.partidaSomenteIA || this.partidaPausada || this.partidaFinalizada || this.faseAtual !== 'COMPRAR_TILE') return;

        this.executarTurnoAutomaticoIA();
        this.notificarObservadores();
    }

    public alternarPausaIA(): void {
        if (!this.partidaSomenteIA || this.partidaFinalizada) return;
        this.partidaPausada = !this.partidaPausada;
        this.mensagemStatus = this.partidaPausada ? 'Partida pausada.' : `Partida retomada. Vez de ${this.jogadorAtual.obterNome()}.`;
        this.notificarObservadores();
    }

    public definirAtrasoEntreAcoesIA(atrasoMs: number): void {
        this.atrasoEntreAcoesIA = Math.max(0, Math.min(10000, Math.round(atrasoMs)));
    }

    public estaPausadaIA(): boolean { return this.partidaPausada; }

    /**
     * Fase: COMPRAR_TILE
     */
    public comprarTileDoTurno(): Tile | null {
        if (this.partidaFinalizada) return null;

        if (this.faseAtual !== 'COMPRAR_TILE') {
            return this.tileManager.obterTileAtual();
        }

        const tile = this.tileManager.comprarTile(this.tabuleiroManager);
        if (!tile) {
            this.finalizarPartida();
            return null;
        }

        this.faseAtual = 'POSICIONAR_TILE';
        this.mensagemStatus = `${this.jogadorAtual.obterNome()}: Gire a peça ou clique numa casa válida do tabuleiro.`;
        this.notificarObservadores();
        return tile;
    }

    public rotacionarTileAtual(): void {
        if (this.faseAtual !== 'POSICIONAR_TILE' || this.partidaFinalizada) return;

        this.tileManager.rotacionarTileAtualDoBaralho();
        this.notificarObservadores();
    }

    /**
     * Fase: POSICIONAR_TILE
     */
    public posicionarTileNoTabuleiro(x: number, y: number): boolean {
        if (this.faseAtual !== 'POSICIONAR_TILE' || this.partidaFinalizada) return false;

        const tileAtual = this.tileManager.obterTileAtual();
        if (!tileAtual) return false;

        // Validação estritamente delegada ao TabuleiroManager
        if (!this.tabuleiroManager.validarPosicaoTile(tileAtual, x, y)) {
            this.mensagemStatus = 'Posição inválida! As bordas (Cidade, Estrada, Campo) devem combinar perfeitamente com os vizinhos.';
            this.notificarObservadores();
            return false;
        }

        this.tabuleiroManager.obterTabuleiro().posicionarTile(tileAtual, x, y);
        this.ultimoTilePosicionado = tileAtual;
        this.tileManager.limparTileAtual();

        if (this.jogadorAtual.temMeepleDisponivel()) {
            this.faseAtual = 'POSICIONAR_MEEPLE';
            this.mensagemStatus = `${this.jogadorAtual.obterNome()}: Escolha onde colocar um Meeple na peça ou clique em "Passar Turno".`;
        } else {
            this.finalizarJogadaEPontuar();
        }

        this.notificarObservadores();
        return true;
    }

    /**
     * Fase: POSICIONAR_MEEPLE
     */
    public alocarMeepleNoTileAtual(idSubsegmento: number): boolean {
        if (
            (this.faseAtual !== 'POSICIONAR_MEEPLE' && this.faseAtual !== 'ALOCAR_MEEPLE') ||
            !this.ultimoTilePosicionado ||
            this.partidaFinalizada
        ) {
            return false;
        }

        if (!this.tabuleiroManager.validarPosicaoMeeple(this.ultimoTilePosicionado, idSubsegmento)) {
            this.mensagemStatus = 'Não é possível colocar um Meeple nessa posição! (Estrutura já ocupada ou inválida).';
            this.notificarObservadores();
            return false;
        }

        const meeple = this.jogadorAtual.pegarMeeple();
        if (!meeple) return false;

        meeple.alocarMeeple(this.ultimoTilePosicionado, idSubsegmento);

        this.finalizarJogadaEPontuar();
        this.notificarObservadores();
        return true;
    }

    /**
     * Permite passar o turno sem posicionar Meeple na peça recém-colocada.
     */
    public finalizarTurnoSemMeeple(): void {
        if (this.faseAtual !== 'POSICIONAR_MEEPLE' && this.faseAtual !== 'ALOCAR_MEEPLE') return;
        this.finalizarJogadaEPontuar();
        this.notificarObservadores();
    }

    /**
     * Fase: FINALIZAR_TURNO
     */
    private finalizarJogadaEPontuar(): void {
        this.faseAtual = 'FINALIZAR_TURNO';

        if (this.ultimoTilePosicionado) {
            this.tabuleiroManager.verificarEPontuarFechamentos(this.ultimoTilePosicionado);
        }

        if (this.verificarFimDePartida()) {
            this.finalizarPartida();
        } else {
            this.proximoTurno();
        }
    }

    public proximoTurno(): void {
        if (this.partidaFinalizada) return;

        // Se ainda estava na fase de meeple e o jogador passou:
        if (
            (this.faseAtual === 'POSICIONAR_MEEPLE' || this.faseAtual === 'ALOCAR_MEEPLE') &&
            this.ultimoTilePosicionado
        ) {
            this.tabuleiroManager.verificarEPontuarFechamentos(this.ultimoTilePosicionado);
        }

        if (this.verificarFimDePartida()) {
            this.finalizarPartida();
            return;
        }

        const participantesAtivos = this.participantes.filter((p) => p.estaAtivo());
        if (participantesAtivos.length <= 1 && this.participantes.length > 1) {
            this.finalizarPartida();
            return;
        }

        // Avança até o próximo participante ativo
        do {
            this.indiceJogadorAtual = (this.indiceJogadorAtual + 1) % this.participantes.length;
            this.jogadorAtual = this.participantes[this.indiceJogadorAtual];
        } while (!this.jogadorAtual.estaAtivo());

        this.ultimoTilePosicionado = null;
        this.faseAtual = 'COMPRAR_TILE';
        this.mensagemStatus = `Vez de ${this.jogadorAtual.obterNome()} comprar uma peça.`;

        if (this.jogadorAtual.ehAutomatico() && !this.partidaSomenteIA) {
            setTimeout(() => {
                if (!this.partidaFinalizada && this.jogadorAtual.ehAutomatico() && this.faseAtual === 'COMPRAR_TILE') {
                    this.executarTurnoAutomaticoIA();
                    this.notificarObservadores();
                }
            }, this.atrasoEntreAcoesIA);
        }

        this.notificarObservadores();
    }

    private executarTurnoAutomaticoIA(): void {
        const ia = this.jogadorAtual as IA;
        const tile = this.tileManager.comprarTile(this.tabuleiroManager);
        if (!tile) {
            this.finalizarPartida();
            return;
        }

        // Delegado via GoF Strategy da IA
        const posicaoEscolhida = ia.decidirJogada(tile, this.tabuleiroManager);

        // A jogada da IA passa pela mesma validação de um jogador humano
        if (posicaoEscolhida && this.tabuleiroManager.validarPosicaoTile(tile, posicaoEscolhida.x, posicaoEscolhida.y)) {
            this.tabuleiroManager.obterTabuleiro().posicionarTile(tile, posicaoEscolhida.x, posicaoEscolhida.y);
            this.ultimoTilePosicionado = tile;
            this.tileManager.limparTileAtual();

            if (ia.temMeepleDisponivel()) {
                const subId = ia.decidirMeeple(tile, this.tabuleiroManager);
                if (subId !== null) {
                    const meepleIA = ia.pegarMeeple();
                    if (meepleIA) {
                        meepleIA.alocarMeeple(tile, subId);
                    }
                }
            }
        } else {
            // Descarte caso a IA não tenha encontrado posição
            this.tileManager.descartarTile(tile);
        }

        this.finalizarJogadaEPontuar();
    }

    /**
     * Verifica as condições de término da partida:
     * 1. Baralho vazio e sem peça em mãos, OU
     * 2. Menos de dois jogadores ativos restantes em partida multijogador.
     */
    public verificarFimDePartida(): boolean {
        if (this.partidaFinalizada) return true;

        const baralhoEsgotado = this.tileManager.baralhoVazio() && this.tileManager.obterTileAtual() === null;
        const participantesAtivos = this.participantes.filter((p) => p.estaAtivo()).length;

        return baralhoEsgotado || (this.participantes.length > 1 && participantesAtivos <= 1);
    }

    /**
     * Finaliza a partida calculando os pontos de features incompletas e determinando os vencedores.
     */
    public finalizarPartida(): void {
        if (this.partidaFinalizada) return;

        this.partidaFinalizada = true;
        this.faseAtual = 'FIM_DE_JOGO';

        // Pontuação final de cidades, estradas, mosteiros incompletos e campos
        this.tabuleiroManager.pontuarFeaturesIncompletas();

        const vencedores = this.determinarVencedores();
        const nomesVencedores = vencedores.map((v) => `${v.obterNome()} (${v.obterPontuacao()} pts)`).join(', ');

        this.mensagemStatus = `🏆 Fim de Jogo! Vencedor(es): ${nomesVencedores}.`;
        this.notificarObservadores();
    }

    /**
     * Determina o(s) participante(s) vencedor(es) com base na maior pontuação acumulada.
     */
    public determinarVencedores(): Participante[] {
        const candidatos = this.participantes.filter((p) => p.estaAtivo());
        const listaAvaliar = candidatos.length > 0 ? candidatos : this.participantes;

        let maiorPontuacao = -1;
        for (const p of listaAvaliar) {
            if (p.obterPontuacao() > maiorPontuacao) {
                maiorPontuacao = p.obterPontuacao();
            }
        }

        return listaAvaliar.filter((p) => p.obterPontuacao() === maiorPontuacao);
    }

    /**
     * Remove ou marca um participante como desistente e avança a partida.
     */
    public removerParticipante(participante: Participante): void {
        participante.marcarComoDesistente();

        if (this.jogadorAtual === participante) {
            // A peça em mãos do desistente sai do jogo como descarte
            const tileEmMaos = this.tileManager.obterTileAtual();
            if (tileEmMaos) {
                this.tileManager.descartarTile(tileEmMaos);
            }
            this.proximoTurno();
        } else if (this.verificarFimDePartida()) {
            this.finalizarPartida();
        } else {
            this.notificarObservadores();
        }
    }

    // --- Getters de estado ---
    public obterJogadorAtual(): Participante { return this.jogadorAtual; }
    public obterParticipantes(): Participante[] { return this.participantes; }
    public obterTabuleiro(): Tabuleiro { return this.tabuleiroManager.obterTabuleiro(); }
    public obterTileEmMaos(): Tile | null { return this.tileManager.obterTileAtual(); }
    public obterQuantidadeBaralho(): number { return this.tileManager.obterQuantidadeRestante(); }
    public obterFaseAtual(): FaseDoTurno { return this.faseAtual; }
    public obterMensagemStatus(): string { return this.mensagemStatus; }
    public obterUltimoTilePosicionado(): Tile | null { return this.ultimoTilePosicionado; }
    public estaFinalizada(): boolean { return this.partidaFinalizada; }
    public ehPartidaSomenteIA(): boolean { return this.partidaSomenteIA; }
    public obterTileManager(): TileManager { return this.tileManager; }
    public obterTabuleiroManager(): TabuleiroManager { return this.tabuleiroManager; }
}



