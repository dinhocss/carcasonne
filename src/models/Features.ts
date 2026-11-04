import type { Tile } from './Tile';


export class Cidade {
    private temEscudo: boolean;
    private tiles: Tile[] = [];

    constructor(temEscudo: boolean = false, tiles: Tile[] = []) {
        this.temEscudo = temEscudo;
        this.tiles = tiles;
    }

    public possuiEscudo(): boolean {
        return this.temEscudo;
    }

    public definirEscudo(temEscudo: boolean): void {
        this.temEscudo = temEscudo;
    }

    public obterTiles(): Tile[] {
        return [...this.tiles];
    }

    public adicionarTile(tile: Tile): void {
        if (!this.tiles.includes(tile)) {
            this.tiles.push(tile);
            if (tile.temEscudo) {
                this.temEscudo = true;
            }
        }
    }
}

export class Estrada {
    private tiles: Tile[] = [];

    constructor(tiles: Tile[] = []) {
        this.tiles = tiles;
    }

    public obterTiles(): Tile[] {
        return [...this.tiles];
    }

    public adicionarTile(tile: Tile): void {
        if (!this.tiles.includes(tile)) {
            this.tiles.push(tile);
        }
    }
}

export class Mosteiro {
    private tile: Tile | null;

    constructor(tile: Tile | null = null) {
        this.tile = tile;
    }

    public obterTile(): Tile | null {
        return this.tile;
    }

    public definirTile(tile: Tile): void {
        this.tile = tile;
    }
}


export class Campo {
    private cidadesAdjacentes: Cidade[] = [];

    constructor(cidadesAdjacentes: Cidade[] = []) {
        this.cidadesAdjacentes = cidadesAdjacentes;
    }

    public cidadesAdjacentesCompletas(): number {
        return this.cidadesAdjacentes.length;
    }

    public adicionarCidadeAdjacente(cidade: Cidade): void {
        if (!this.cidadesAdjacentes.includes(cidade)) {
            this.cidadesAdjacentes.push(cidade);
        }
    }
}

