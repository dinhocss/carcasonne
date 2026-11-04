import { Tile } from './Tile';

export class Tabuleiro {
    public readonly tamanho: number;
    private tilesNoTabuleiro: (Tile | null)[][];

    constructor(tamanho: number = 11) {
        this.tamanho = tamanho;
        this.tilesNoTabuleiro = Array.from({ length: tamanho }, () =>
            Array(tamanho).fill(null)
        );
    }

    public obterTile(x: number, y: number): Tile | null {
        if (x < 0 || x >= this.tamanho || y < 0 || y >= this.tamanho) {
            return null;
        }
        return this.tilesNoTabuleiro[y][x];
    }

    public estaVazio(x: number, y: number): boolean {
        return this.obterTile(x, y) === null;
    }

    public posicionarTile(tile: Tile, x: number, y: number): boolean {
        if (x < 0 || x >= this.tamanho || y < 0 || y >= this.tamanho) {
            return false;
        }
        if (!this.estaVazio(x, y)) {
            return false;
        }
        tile.definirPosicao(x, y);
        this.tilesNoTabuleiro[y][x] = tile;
        return true;
    }

    public obterTilesAdjacentes(x: number, y: number): Tile[] {
        const vizinhos: Tile[] = [];
        const direcoes = [
            { dx: 0, dy: -1 },
            { dx: 1, dy: 0 },
            { dx: 0, dy: 1 },
            { dx: -1, dy: 0 }
        ];

        for (const dir of direcoes) {
            const vizinho = this.obterTile(x + dir.dx, y + dir.dy);
            if (vizinho) {
                vizinhos.push(vizinho);
            }
        }
        return vizinhos;
    }

    public obterGrid(): (Tile | null)[][] {
        return this.tilesNoTabuleiro;
    }
}