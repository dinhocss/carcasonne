import { catalogo_pecas } from '../data/tilesData';
import { Tile } from './Tile';
import { TabuleiroManager } from './TabuleiroManager';

/**
 * TileManager (GRASP Creator & Information Expert)
 * Responsável por instanciar as 72 peças do jogo (-inicializarBaralho()),
 * controlar o baralho, embaralhar com base em seed, e descartar peças inválidas.
 */
export class TileManager {
    private seed: number;
    private baralho: Tile[] = [];
    private tileAtual: Tile | null = null;
    private descartes: Tile[] = [];

    constructor(seed?: number) {
        this.seed = seed ?? Math.floor(Math.random() * 1000000);
        this.inicializarBaralho();
        this.embaralhar();
    }

    /**
     * Instancia todas as peças físicas do jogo com base no catálogo oficial.
     * Padrão GRASP Creator.
     */
    public inicializarBaralho(): void {
        this.baralho = [];
        this.descartes = [];
        this.tileAtual = null;
        let contadorId = 1;

        for (const item of catalogo_pecas) {
            for (let i = 0; i < item.quantidade; i++) {
                const novoTile = new Tile(`tile_${contadorId++}`, item.modelo);
                this.baralho.push(novoTile);
            }
        }
    }

    /**
     * Embaralha as peças contidas no baralho utilizando a seed atual.
     */
    public embaralhar(): void {
        let currentSeed = this.seed;
        // Gerador pseudo-aleatório baseado na seed (LCG simples)
        const pseudoRandom = () => {
            currentSeed = (currentSeed * 9301 + 49297) % 233280;
            return currentSeed / 233280;
        };

        for (let i = this.baralho.length - 1; i > 0; i--) {
            const j = Math.floor(pseudoRandom() * (i + 1));
            [this.baralho[i], this.baralho[j]] = [this.baralho[j], this.baralho[i]];
        }
    }

    /**
     * Retira do baralho a peça inicial oficial: cidade em um lado com estrada reta.
     */
    public retirarPecaInicial(): Tile | null {
        const indice = this.baralho.findIndex((t) => t.tipo === 'CIDADE_1_LADO_ESTRADA_RETA');
        if (indice === -1) return null;
        return this.baralho.splice(indice, 1)[0];
    }

    /**
     * Saca a próxima peça válida do baralho.
     * Se um TabuleiroManager for fornecido (ou obtido como Singleton),
     * verifica se a peça pode ser colocada; caso não possa, ela é descartada.
     */
    public comprarTile(tabuleiroManager?: TabuleiroManager): Tile | null {
        const mgr = tabuleiroManager ?? TabuleiroManager.getInstance();

        while (this.baralho.length > 0) {
            const candidato = this.baralho.pop()!;
            if (!mgr || !this.existeTileParaDescarte(candidato, mgr)) {
                this.tileAtual = candidato;
                return this.tileAtual;
            }
            // Peça descartada automaticamente por ser impossível de posicionar
            this.descartarTile(candidato);
        }

        this.tileAtual = null;
        return null;
    }

    /**
     * Verifica se a peça não pode ser encaixada em nenhuma posição válida do tabuleiro.
     */
    public existeTileParaDescarte(tile: Tile, tabuleiroManager?: TabuleiroManager): boolean {
        const mgr = tabuleiroManager ?? TabuleiroManager.getInstance();
        if (!mgr) return false;
        // Se NÃO existe posição válida para o tile, ele é elegível para descarte
        return !mgr.existePosicaoValidaParaTile(tile);
    }

    /**
     * Descarta uma peça que não pôde ser posicionada.
     */
    public descartarTile(tile: Tile): void {
        this.descartes.push(tile);
        if (this.tileAtual && this.tileAtual.id === tile.id) {
            this.tileAtual = null;
        }
    }

    /**
     * Informa se o baralho de compras está vazio.
     */
    public baralhoVazio(): boolean {
        return this.baralho.length === 0;
    }

    /**
     * Rotaciona a peça atualmente em mãos do jogador/baralho em 90 graus no sentido horário.
     */
    public rotacionarTileAtualDoBaralho(): void {
        if (this.tileAtual) {
            this.tileAtual.rotacionar();
        }
    }

    public obterTileAtual(): Tile | null {
        return this.tileAtual;
    }

    public definirTileAtual(tile: Tile | null): void {
        this.tileAtual = tile;
    }

    public limparTileAtual(): void {
        this.tileAtual = null;
    }

    public obterQuantidadeRestante(): number {
        return this.baralho.length;
    }

    public obterDescartes(): Tile[] {
        return [...this.descartes];
    }

    public obterSeed(): number {
        return this.seed;
    }

    public definirSeed(seed: number): void {
        this.seed = seed;
    }
}
