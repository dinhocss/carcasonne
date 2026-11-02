import { Posicao, type TipoTerreno } from './Enums';
import type { Meeple } from './Meeple';

export interface DadosModeloTile {
    tipo: string;
    imagem: string;
    bordas: [TipoTerreno, TipoTerreno, TipoTerreno, TipoTerreno]; // [Norte, Leste, Sul, Oeste]
    temEscudo: boolean;
}

export class Tile {
    public readonly id: string;
    public readonly tipo: string;
    public readonly imagem: string;
    public readonly temEscudo: boolean;

    private subsegmentos: TipoTerreno[]; 
    private meeplesAlocados: (Meeple | null)[]; 
    private posicao: Posicao | null = null;
    private rotacao: number = 0; 

    constructor(id: string, dados: DadosModeloTile) {
        this.id = id;
        this.tipo = dados.tipo;
        this.imagem = dados.imagem;
        this.temEscudo = dados.temEscudo;
        this.meeplesAlocados = Array(13).fill(null);

        
        const [norte, leste, sul, oeste] = dados.bordas;
        const centro: TipoTerreno = dados.tipo.includes('MOSTEIRO') ? 'MOSTEIRO' : 'CAMPO';

        this.subsegmentos = [
            norte, norte, norte, 
            leste, leste, leste, 
            sul,   sul,   sul,   
            oeste, oeste, oeste, 
            centro               
        ];
    }

    public rotacionar(): void {
        this.rotacao = (this.rotacao + 90) % 360;

        const n = this.subsegmentos.slice(0, 3);
        const l = this.subsegmentos.slice(3, 6);
        const s = this.subsegmentos.slice(6, 9);
        const o = this.subsegmentos.slice(9, 12);
        const centro = this.subsegmentos[12];

        this.subsegmentos = [...o, ...n, ...l, ...s, centro];
    }

    public obterTipoSubsegmento(idSubsegmento: number): TipoTerreno {
        return this.subsegmentos[idSubsegmento];
    }

    public obterBordaNorte(): TipoTerreno { return this.subsegmentos[1]; }
    public obterBordaLeste(): TipoTerreno { return this.subsegmentos[4]; }
    public obterBordaSul(): TipoTerreno   { return this.subsegmentos[7]; }
    public obterBordaOeste(): TipoTerreno { return this.subsegmentos[10]; }

    public posicionarMeeple(meeple: Meeple, idSubsegmento: number): void {
        this.meeplesAlocados[idSubsegmento] = meeple;
    }

    public obterMeeple(idSubsegmento: number): Meeple | null {
        return this.meeplesAlocados[idSubsegmento];
    }

    public removerMeeple(idSubsegmento: number): Meeple | null {
        const m = this.meeplesAlocados[idSubsegmento];
        this.meeplesAlocados[idSubsegmento] = null;
        return m;
    }

    public obterTodosMeeplesNoTile(): Meeple[] {
        return this.meeplesAlocados.filter((m): m is Meeple => m !== null);
    }

    public definirPosicao(x: number, y: number): void {
        this.posicao = new Posicao(x, y);
    }

    public obterPosicao(): Posicao | null {
        return this.posicao;
    }

    public obterRotacao(): number {
        return this.rotacao;
    }
}