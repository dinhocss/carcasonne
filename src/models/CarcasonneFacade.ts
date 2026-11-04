import { GameManager, type IGameObserver, type FaseDoTurno } from './GameManager';
import { TabuleiroManager } from './TabuleiroManager';
import { TileManager } from './TileManager';
import { Tabuleiro } from './Tabuleiro';
import { Tile } from './Tile';
import { Participante, type EstrategiaIA, IA } from './Participante';


export class CarcasonneFacade {
    private gameManager: GameManager;
    private tabuleiroManager: TabuleiroManager;
    private tileManager: TileManager;

    constructor() {
        this.gameManager = GameManager.getInstance();
        this.tabuleiroManager = TabuleiroManager.getInstance();
        this.tileManager = this.gameManager.obterTileManager();
    }


    public iniciarNovaPartida(nomesJogadores: string[]): void {
        this.gameManager.iniciarPartida(false, nomesJogadores);
        this.tileManager = this.gameManager.obterTileManager();
    }

    public iniciarPartidaConfigurada(
        participantes: { nome: string; tipo: 'JOGADOR' | 'IA'; estrategia?: EstrategiaIA }[]
    ): void {
        this.gameManager.iniciarPartidaConfigurada(participantes);
        this.tileManager = this.gameManager.obterTileManager();
    }


    public iniciarPartidaContraIA(
        nomeHumano: string = 'Jogador 1',
        nomeIA: string = 'Bot Carcassonne (IA)',
        estrategia?: EstrategiaIA
    ): void {
        this.gameManager.iniciarPartida(true, [nomeHumano, nomeIA]);
        this.tileManager = this.gameManager.obterTileManager();

        if (estrategia) {
            const participantes = this.gameManager.obterParticipantes();
            const ia = participantes.find((p): p is IA => p instanceof IA);
            if (ia) {
                ia.definirEstrategia(estrategia);
            }
        }
    }


    public iniciarPartidaIAContraIA(
        nomes: [string, string],
        estrategias: [EstrategiaIA, EstrategiaIA]
    ): void {
        this.gameManager.iniciarPartidaIAContraIA(nomes, estrategias);
        this.tileManager = this.gameManager.obterTileManager();
    }

    public executarTurnoIA(): void {
        this.gameManager.executarTurnoIA();
    }

    public alternarPausaIA(): void {
        this.gameManager.alternarPausaIA();
    }

    public estaPausadaIA(): boolean {
        return this.gameManager.estaPausadaIA();
    }

    public definirAtrasoEntreAcoesIA(atrasoMs: number): void {
        this.gameManager.definirAtrasoEntreAcoesIA(atrasoMs);
    }

    public ehPartidaSomenteIA(): boolean {
        return this.gameManager.ehPartidaSomenteIA();
    }


    public realizarJogada(
        x: number,
        y: number,
        rotacao: number,
        idSubsegmentoMeeple: number
    ): boolean {
        if (this.gameManager.obterFaseAtual() === 'COMPRAR_TILE') {
            const comprada = this.gameManager.comprarTileDoTurno();
            if (!comprada) return false;
        }

        const tileAtual = this.gameManager.obterTileEmMaos();
        if (!tileAtual) return false;

        const rotacaoDesejada = ((rotacao % 360) + 360) % 360;
        let tentativas = 0;
        while (tileAtual.obterRotacao() !== rotacaoDesejada && tentativas < 4) {
            this.gameManager.rotacionarTileAtual();
            tentativas++;
        }

        const posicionou = this.gameManager.posicionarTileNoTabuleiro(x, y);
        if (!posicionou) {
            return false;
        }

        if (idSubsegmentoMeeple >= 0) {
            const alocou = this.gameManager.alocarMeepleNoTileAtual(idSubsegmentoMeeple);
            if (!alocou) {
                this.gameManager.finalizarTurnoSemMeeple();
            }
        } else {
            this.gameManager.finalizarTurnoSemMeeple();
        }

        return true;
    }


    public passarTurno(): void {
        if (
            this.gameManager.obterFaseAtual() === 'POSICIONAR_MEEPLE' ||
            this.gameManager.obterFaseAtual() === 'ALOCAR_MEEPLE'
        ) {
            this.gameManager.finalizarTurnoSemMeeple();
        }
    }


    public comprarTile(): Tile | null {
        return this.gameManager.comprarTileDoTurno();
    }

    public rotacionarTile(): void {
        this.gameManager.rotacionarTileAtual();
    }

    public posicionarTile(x: number, y: number): boolean {
        return this.gameManager.posicionarTileNoTabuleiro(x, y);
    }

    public alocarMeeple(idSubsegmento: number): boolean {
        return this.gameManager.alocarMeepleNoTileAtual(idSubsegmento);
    }

    public removerParticipante(participante: Participante): void {
        this.gameManager.removerParticipante(participante);
    }

    public obterTabuleiro(): Tabuleiro {
        return this.gameManager.obterTabuleiro();
    }

    public obterParticipantes(): Participante[] {
        return this.gameManager.obterParticipantes();
    }

    public obterJogadorAtual(): Participante {
        return this.gameManager.obterJogadorAtual();
    }

    public obterTileAtual(): Tile | null {
        return this.gameManager.obterTileEmMaos();
    }

    public obterUltimoTilePosicionado(): Tile | null {
        return this.gameManager.obterUltimoTilePosicionado();
    }

    public obterFaseAtual(): FaseDoTurno {
        return this.gameManager.obterFaseAtual();
    }

    public obterMensagemStatus(): string {
        return this.gameManager.obterMensagemStatus();
    }

    public obterQuantidadeBaralho(): number {
        return this.gameManager.obterQuantidadeBaralho();
    }

    public verificarFimDePartida(): boolean {
        return this.gameManager.verificarFimDePartida();
    }

    public obterVencedores(): Participante[] {
        return this.gameManager.determinarVencedores();
    }

    public estaFinalizada(): boolean {
        return this.gameManager.estaFinalizada();
    }

    public adicionarObservador(obs: IGameObserver): void {
        this.gameManager.adicionarObservador(obs);
    }

    public removerObservador(obs: IGameObserver): void {
        this.gameManager.removerObservador(obs);
    }

    public obterGameManager(): GameManager {
        return this.gameManager;
    }

    public obterTabuleiroManager(): TabuleiroManager {
        return this.tabuleiroManager;
    }

    public obterTileManager(): TileManager {
        return this.tileManager;
    }
}


export const CarcassonneFacade = CarcasonneFacade;
export type CarcassonneFacade = CarcasonneFacade;

