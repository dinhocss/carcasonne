import { Participante, Jogador, IA } from './Participante';
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
 * GameManager (Controller):
 * Atua ESTRITAMENTE como orquestrador do fluxo do turno:
 * Fases: COMPRAR_TILE -> POSICIONAR_TILE -> POSICIONAR_MEEPLE -> FINALIZAR_TURNO.
 * NÃO contém regras de validação de vizinhança nem cálculos diretos de pontuação.
 */
export class GameManager {
    private static instancia: GameManager | null = null;
    private observadores: IGameObserver[] = [];

    private participantes: Participante[] = [];
    private jogadorAtual: Participante;
    private indiceJogadorAtual: number = 0;
    private tileManager: TileManager;
    private tabuleiroManager: TabuleiroManager;

    private ultimoTilePosicionado: Tile | null = null;
    private faseAtual: FaseDoTurno = 'COMPRAR_TILE';
    private mensagemStatus: string = 'Bem-vindo ao Carcassonne!';

    private constructor() {
        const tabuleiro = new Tabuleiro(11);
        this.tabuleiroManager = new TabuleiroManager(tabuleiro);
        this.tileManager = new TileManager();

        this.participantes = [
            new Jogador('Jogador 1 (Você)', '#4CAF50'),
            new Jogador('Jogador 2', '#2196F3')
        ];
        this.jogadorAtual = this.participantes[0];
    }

    public static getInstance(): GameManager {
        if (!GameManager.instancia) {
            GameManager.instancia = new GameManager();
        }
        return GameManager.instancia;
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

    public iniciarPartida(comIA: boolean = false): void {
        const tabuleiro = new Tabuleiro(11);
        this.tabuleiroManager = new TabuleiroManager(tabuleiro);
        this.tileManager = new TileManager();

        this.participantes = [
            new Jogador('Jogador 1', '#4CAF50'),
            comIA ? new IA('Bot Carcassonne (IA)', '#FF9800') : new Jogador('Jogador 2', '#2196F3')
        ];
        this.indiceJogadorAtual = 0;
        this.jogadorAtual = this.participantes[0];
        this.ultimoTilePosicionado = null;

        // Peça inicial posicionada no centro do tabuleiro (5, 5)
        const pecaInicial = this.tileManager.comprarTile();
        if (pecaInicial) {
            this.tabuleiroManager.obterTabuleiro().posicionarTile(pecaInicial, 5, 5);
            this.tileManager.limparTileAtual();
        }

        this.faseAtual = 'COMPRAR_TILE';
        this.mensagemStatus = `Partida iniciada! Vez de ${this.jogadorAtual.obterNome()} comprar uma peça.`;
        this.notificarObservadores();
    }

    /**
     * Fase: COMPRAR_TILE
     */
    public comprarTileDoTurno(): Tile | null {
        if (this.faseAtual !== 'COMPRAR_TILE') {
            return this.tileManager.obterTileAtual();
        }

        // Delegado ao TileManager com descarte automático de peças impossíveis
        const tile = this.tileManager.comprarTile(this.tabuleiroManager);
        if (!tile) {
            this.faseAtual = 'FIM_DE_JOGO';
            this.mensagemStatus = 'O baralho acabou ou não há mais jogadas possíveis! Fim de jogo!';
            this.notificarObservadores();
            return null;
        }

        this.faseAtual = 'POSICIONAR_TILE';
        this.mensagemStatus = `${this.jogadorAtual.obterNome()}: Gire a peça ou clique numa casa válida do tabuleiro.`;
        this.notificarObservadores();
        return tile;
    }

    public rotacionarTileAtual(): void {
        if (this.faseAtual !== 'POSICIONAR_TILE') return;

        this.tileManager.rotacionarTileAtualDoBaralho();
        this.notificarObservadores();
    }

    /**
     * Fase: POSICIONAR_TILE
     */
    public posicionarTileNoTabuleiro(x: number, y: number): boolean {
        if (this.faseAtual !== 'POSICIONAR_TILE') return false;

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
            !this.ultimoTilePosicionado
        ) {
            return false;
        }

        // Validação estritamente delegada ao TabuleiroManager
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
            // Fechamento e pontuação estritamente delegados ao TabuleiroManager
            this.tabuleiroManager.verificarEPontuarFechamentos(this.ultimoTilePosicionado);
        }

        this.proximoTurno();
    }

    public proximoTurno(): void {
        // Se ainda estava na fase de meeple e o jogador chamou proximoTurno diretamente:
        if (
            (this.faseAtual === 'POSICIONAR_MEEPLE' || this.faseAtual === 'ALOCAR_MEEPLE') &&
            this.ultimoTilePosicionado
        ) {
            this.tabuleiroManager.verificarEPontuarFechamentos(this.ultimoTilePosicionado);
        }

        if (this.tileManager.obterQuantidadeRestante() === 0) {
            this.faseAtual = 'FIM_DE_JOGO';
            this.mensagemStatus = 'Fim de jogo! Todas as peças foram jogadas.';
            this.notificarObservadores();
            return;
        }

        this.indiceJogadorAtual = (this.indiceJogadorAtual + 1) % this.participantes.length;
        this.jogadorAtual = this.participantes[this.indiceJogadorAtual];
        this.ultimoTilePosicionado = null;
        this.faseAtual = 'COMPRAR_TILE';
        this.mensagemStatus = `Vez de ${this.jogadorAtual.obterNome()} comprar uma peça.`;

        if (this.jogadorAtual.ehAutomatico()) {
            this.executarTurnoAutomaticoIA();
        }

        this.notificarObservadores();
    }

    private executarTurnoAutomaticoIA(): void {
        const tile = this.tileManager.comprarTile(this.tabuleiroManager);
        if (!tile) {
            this.faseAtual = 'FIM_DE_JOGO';
            this.mensagemStatus = 'Fim de jogo!';
            return;
        }

        const tab = this.tabuleiroManager.obterTabuleiro();
        let posicionou = false;

        for (let rot = 0; rot < 4 && !posicionou; rot++) {
            for (let y = 0; y < tab.tamanho && !posicionou; y++) {
                for (let x = 0; x < tab.tamanho && !posicionou; x++) {
                    if (this.tabuleiroManager.validarPosicaoTile(tile, x, y)) {
                        tab.posicionarTile(tile, x, y);
                        this.ultimoTilePosicionado = tile;
                        this.tileManager.limparTileAtual();
                        posicionou = true;
                    }
                }
            }
            if (!posicionou) tile.rotacionar();
        }

        if (posicionou && this.ultimoTilePosicionado && this.jogadorAtual.temMeepleDisponivel()) {
            const candidatos = this.ultimoTilePosicionado.obterPosicoesValidasMeeple();
            for (const subId of candidatos) {
                const terreno = this.ultimoTilePosicionado.obterTipoSubsegmento(subId);
                if (
                    (terreno === 'MOSTEIRO' || terreno === 'CIDADE' || terreno === 'ESTRADA') &&
                    this.tabuleiroManager.validarPosicaoMeeple(this.ultimoTilePosicionado, subId)
                ) {
                    const meepleIA = this.jogadorAtual.pegarMeeple();
                    if (meepleIA) {
                        meepleIA.alocarMeeple(this.ultimoTilePosicionado, subId);
                        break;
                    }
                }
            }
        }

        this.finalizarJogadaEPontuar();
    }

    public obterJogadorAtual(): Participante { return this.jogadorAtual; }
    public obterParticipantes(): Participante[] { return this.participantes; }
    public obterTabuleiro(): Tabuleiro { return this.tabuleiroManager.obterTabuleiro(); }
    public obterTileEmMaos(): Tile | null { return this.tileManager.obterTileAtual(); }
    public obterQuantidadeBaralho(): number { return this.tileManager.obterQuantidadeRestante(); }
    public obterFaseAtual(): FaseDoTurno { return this.faseAtual; }
    public obterMensagemStatus(): string { return this.mensagemStatus; }
    public obterUltimoTilePosicionado(): Tile | null { return this.ultimoTilePosicionado; }
}
