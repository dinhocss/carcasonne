import type {TilePosicionado} from '../types/Tile';

export class Tabuleiro{
    public readonly tamanho: number;
    public grid: (TilePosicionado | null)[][];

    constructor(tamanho: number = 11){
        this.tamanho = tamanho;
        this.grid = Array.from({length: tamanho}, ()=>Array(tamanho).fill(null));
    }

    public posicionarPeca(linha: number, coluna: number, tile: TilePosicionado):boolean{
        if(linha<0 || linha >= this.tamanho || coluna < 0 || coluna >= this.tamanho){
            return false;
        }
        tile.x = coluna;
        tile.y = linha;
        this.grid[linha][coluna] = tile;
        return true
    }
}