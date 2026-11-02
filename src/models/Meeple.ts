import type { TipoMeeple, TipoTerreno } from './Enums';
import type { Tile } from './Tile';
import type { Participante } from './Participante';

export class Meeple {
    private localizacaoNoTile: number = -1;
    private tipoMeeple: TipoMeeple | null = null;
    private tileAlvo: Tile | null = null;
    private dono: Participante;

    constructor(dono: Participante) {
        this.dono = dono;
    }

    public alocarMeeple(tile: Tile, idSubsegmento: number): void {
        this.tileAlvo = tile;
        this.localizacaoNoTile = idSubsegmento;

        const terreno = tile.obterTipoSubsegmento(idSubsegmento);
        this.definirClassificacao(terreno);

        tile.posicionarMeeple(this, idSubsegmento);
    }

    public desalocarMeeple(): void {
        if (this.tileAlvo && this.localizacaoNoTile !== -1) {
            this.tileAlvo.removerMeeple(this.localizacaoNoTile);
        }
        this.tileAlvo = null;
        this.localizacaoNoTile = -1;
        this.tipoMeeple = null;
    }

    public definirClassificacao(terreno: TipoTerreno): void {
        switch (terreno) {
            case 'CIDADE':
                this.tipoMeeple = 'CAVALEIRO';
                break;
            case 'ESTRADA':
                this.tipoMeeple = 'LADRAO';
                break;
            case 'MOSTEIRO':
                this.tipoMeeple = 'MONGE';
                break;
            case 'CAMPO':
                this.tipoMeeple = 'FAZENDEIRO';
                break;
        }
    }

    public obterDono(): Participante {
        return this.dono;
    }

    public obterTipoMeeple(): TipoMeeple | null {
        return this.tipoMeeple;
    }

    public obterLocalizacaoNoTile(): number {
        return this.localizacaoNoTile;
    }

    public estaDisponivel(): boolean {
        return this.tileAlvo === null;
    }
}