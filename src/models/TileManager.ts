import { catalogo_pecas } from '../data/tilesData';
import { Tile } from './Tile';
import type { TabuleiroManager } from './TabuleiroManager';

export class TileManager {
    private baralho: Tile[] = [];
    private tileAtual: Tile | null = null;

    constructor() {
        this.inicializarBaralho();
        this.embaralhar();
    }

    public inicializarBaralho(): void {
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

    /**
     * Saca a próxima peça válida do baralho.
     * Se um TabuleiroManager for fornecido, descarta automaticamente qualquer peça
     * que não tenha encaixe válido em nenhuma posição e rotação no tabuleiro atual.
     */
    public comprarTile(tabuleiroManager?: TabuleiroManager): Tile | null {
        while (this.baralho.length > 0) {
            const candidato = this.baralho.pop()!;
            if (!tabuleiroManager || tabuleiroManager.existePosicaoValidaParaTile(candidato)) {
                this.tileAtual = candidato;
                return this.tileAtual;
            }
            // Peça descartada automaticamente por ser impossível de posicionar
        }

        this.tileAtual = null;
        return null;
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
