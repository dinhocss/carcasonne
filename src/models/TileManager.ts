import { catalogo_pecas } from '../data/tilesData';
import { Tile } from './Tile';

export class TileManager {
    private baralho: Tile[] = [];
    private tileAtual: Tile | null = null;

    constructor() {
        this.inicializarBaralho();
        this.embaralhar();
    }

    private inicializarBaralho(): void {
        this.baralho = [];
        let contadorId = 1;

        for (const item of catalogo_pecas) {
            for (let i = 0; i < item.quantidade; i++) {
                const novoTile = new Tile(`tile_${contadorId++}`, item.modelo);
                this.baralho.push(novoTile);
            }
        }
    }

    public embaralhar(): void {
        for (let i = this.baralho.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.baralho[i], this.baralho[j]] = [this.baralho[j], this.baralho[i]];
        }
    }

    public comprarTile(): Tile | null {
        if (this.baralho.length === 0) {
            this.tileAtual = null;
            return null;
        }
        this.tileAtual = this.baralho.pop() || null;
        return this.tileAtual;
    }

    public rotacionarTileAtualDoBaralho(): void {
        if (this.tileAtual) {
            this.tileAtual.rotacionar();
        }
    }

    public obterTileAtual(): Tile | null {
        return this.tileAtual;
    }

    public limparTileAtual(): void {
        this.tileAtual = null;
    }

    public obterQuantidadeRestante(): number {
        return this.baralho.length;
    }
}