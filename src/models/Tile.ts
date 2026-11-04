import { Posicao, PosicaoSubsegmento, type TipoTerreno } from './Enums';
import type { Meeple } from './Meeple';

export interface DadosModeloTile {
    tipo: string;
    imagem: string;
    bordas: [TipoTerreno, TipoTerreno, TipoTerreno, TipoTerreno];
    temEscudo: boolean;
}

/**
 * Região de campo de uma peça. Cada borda tem duas metades, numeradas no sentido
 * horário: Norte 0-1, Leste 2-3, Sul 4-5 e Oeste 6-7.
 * "cidades" guarda as bordas de cidade que encostam nessa região.
 */
export interface RegiaoCampo {
    pontos: number[];
    cidades: number[];
}

export class Tile {
    public readonly id: string;
    public readonly tipo: string;
    public readonly imagem: string;
    public readonly temEscudo: boolean;


    private bordas: [TipoTerreno, TipoTerreno, TipoTerreno, TipoTerreno];
    private subsegmentos: TipoTerreno[];
    private meeplesAlocados: (Meeple | null)[];
    private posicao: Posicao | null = null;
    private rotacao: number = 0;


    private static readonly CONEXOES_BASE: Record<string, number[][]> = {
        'CIDADE_1_LADO': [[0]],
        'CIDADE_1_LADO_CRUZAMENTO_3_ESTRADAS': [[0], [1], [2], [3]],
        'CIDADE_1_LADO_ESTRADA_CURVA_DIREITA': [[0], [1, 2]],
        'CIDADE_1_LADO_ESTRADA_CURVA_ESQUERDA': [[0], [2, 3]],
        'CIDADE_1_LADO_ESTRADA_RETA': [[0], [1, 3]],
        'CIDADE_2_LADOS': [[0, 1]],
        'CIDADE_2_LADOS_EMBLEMA': [[0, 1]],
        'CIDADE_2_LADOS_ESTRADA_CURVA_ESQUERDA': [[0, 1], [2, 3]],
        'CIDADE_2_LADOS_ESTRADA_CURVA_ESQUERDA_EMBLEMA': [[0, 1], [2, 3]],
        'CIDADE_3_LADOS': [[0, 1, 2]],
        'CIDADE_3_LADOS_EMBLEMA': [[0, 1, 2]],
        'CIDADE_3_LADOS_ESTRADA': [[0, 1, 2], [3]],
        'CIDADE_3_LADOS_ESTRADA_EMBLEMA': [[0, 1, 2], [3]],
        'CIDADE_4_LADOS_EMBLEMA': [[0, 1, 2, 3]],
        'CIDADE_CANTOS_ADJACENTES': [[0], [1]],
        'CIDADE_CANTOS_PARALELOS': [[0], [2]],
        'CIDADE_PONTE': [[0, 2]],
        'CIDADE_PONTE_EMBLEMA': [[0, 2]],
        'CRUZAMENTO_3_ESTRADAS': [[0], [1], [2]],
        'CRUZAMENTO_4_ESTRADAS': [[0], [1], [2], [3]],
        'ESTRADA_CURVA': [[0, 1]],
        'ESTRADA_RETA': [[0, 2]],
        'MOSTEIRO_ESTRADA': [[0]],
        'MOSTEIRO_ISOLADO': []
    };

    private static readonly CAMPOS_BASE: Record<string, RegiaoCampo[]> = {
        'CIDADE_1_LADO': [{ pontos: [2, 3, 4, 5, 6, 7], cidades: [0] }],
        'CIDADE_1_LADO_CRUZAMENTO_3_ESTRADAS': [
            { pontos: [2, 7], cidades: [0] },
            { pontos: [3, 4], cidades: [] },
            { pontos: [5, 6], cidades: [] }
        ],
        'CIDADE_1_LADO_ESTRADA_CURVA_DIREITA': [
            { pontos: [3, 4], cidades: [] },
            { pontos: [2, 5, 6, 7], cidades: [0] }
        ],
        'CIDADE_1_LADO_ESTRADA_CURVA_ESQUERDA': [
            { pontos: [5, 6], cidades: [] },
            { pontos: [2, 3, 4, 7], cidades: [0] }
        ],
        'CIDADE_1_LADO_ESTRADA_RETA': [
            { pontos: [2, 7], cidades: [0] },
            { pontos: [3, 4, 5, 6], cidades: [] }
        ],
        'CIDADE_2_LADOS': [{ pontos: [4, 5, 6, 7], cidades: [0] }],
        'CIDADE_2_LADOS_EMBLEMA': [{ pontos: [4, 5, 6, 7], cidades: [0] }],
        'CIDADE_2_LADOS_ESTRADA_CURVA_ESQUERDA': [
            { pontos: [5, 6], cidades: [] },
            { pontos: [4, 7], cidades: [0] }
        ],
        'CIDADE_2_LADOS_ESTRADA_CURVA_ESQUERDA_EMBLEMA': [
            { pontos: [5, 6], cidades: [] },
            { pontos: [4, 7], cidades: [0] }
        ],
        'CIDADE_3_LADOS': [{ pontos: [6, 7], cidades: [0] }],
        'CIDADE_3_LADOS_EMBLEMA': [{ pontos: [6, 7], cidades: [0] }],
        'CIDADE_3_LADOS_ESTRADA': [
            { pontos: [6], cidades: [0] },
            { pontos: [7], cidades: [0] }
        ],
        'CIDADE_3_LADOS_ESTRADA_EMBLEMA': [
            { pontos: [6], cidades: [0] },
            { pontos: [7], cidades: [0] }
        ],
        'CIDADE_4_LADOS_EMBLEMA': [],
        'CIDADE_CANTOS_ADJACENTES': [{ pontos: [4, 5, 6, 7], cidades: [0, 1] }],
        'CIDADE_CANTOS_PARALELOS': [{ pontos: [2, 3, 6, 7], cidades: [0, 2] }],
        'CIDADE_PONTE': [
            { pontos: [2, 3], cidades: [0] },
            { pontos: [6, 7], cidades: [0] }
        ],
        'CIDADE_PONTE_EMBLEMA': [
            { pontos: [2, 3], cidades: [0] },
            { pontos: [6, 7], cidades: [0] }
        ],
        'CRUZAMENTO_3_ESTRADAS': [
            { pontos: [1, 2], cidades: [] },
            { pontos: [3, 4], cidades: [] },
            { pontos: [5, 6, 7, 0], cidades: [] }
        ],
        'CRUZAMENTO_4_ESTRADAS': [
            { pontos: [1, 2], cidades: [] },
            { pontos: [3, 4], cidades: [] },
            { pontos: [5, 6], cidades: [] },
            { pontos: [7, 0], cidades: [] }
        ],
        'ESTRADA_CURVA': [
            { pontos: [1, 2], cidades: [] },
            { pontos: [3, 4, 5, 6, 7, 0], cidades: [] }
        ],
        'ESTRADA_RETA': [
            { pontos: [1, 2, 3, 4], cidades: [] },
            { pontos: [5, 6, 7, 0], cidades: [] }
        ],
        'MOSTEIRO_ESTRADA': [{ pontos: [0, 1, 2, 3, 4, 5, 6, 7], cidades: [] }],
        'MOSTEIRO_ISOLADO': [{ pontos: [0, 1, 2, 3, 4, 5, 6, 7], cidades: [] }]
    };

    constructor(id: string, dados: DadosModeloTile) {
        this.id = id;
        this.tipo = dados.tipo;
        this.imagem = dados.imagem;
        this.temEscudo = dados.temEscudo;
        this.meeplesAlocados = Array(13).fill(null);

        this.bordas = [...dados.bordas];

        const [norte, leste, sul, oeste] = dados.bordas;
        const centro: TipoTerreno = dados.tipo.includes('MOSTEIRO') ? 'MOSTEIRO' : 'CAMPO';

        this.subsegmentos = [
            norte, norte, norte,
            leste, leste, leste,
            sul, sul, sul,
            oeste, oeste, oeste,
            centro
        ];
    }

    public rotacionar(): void {
        this.rotacao = (this.rotacao + 90) % 360;


        const [n, l, s, o] = this.bordas;
        this.bordas = [o, n, l, s];

        const segN = this.subsegmentos.slice(0, 3);
        const segL = this.subsegmentos.slice(3, 6);
        const segS = this.subsegmentos.slice(6, 9);
        const segO = this.subsegmentos.slice(9, 12);
        const centro = this.subsegmentos[12];

        this.subsegmentos = [...segO, ...segN, ...segL, ...segS, centro];
    }

    public obterBordas(): [TipoTerreno, TipoTerreno, TipoTerreno, TipoTerreno] {
        return [...this.bordas];
    }

    public obterBordaNorte(): TipoTerreno { return this.bordas[0]; }
    public obterBordaLeste(): TipoTerreno { return this.bordas[1]; }
    public obterBordaSul(): TipoTerreno { return this.bordas[2]; }
    public obterBordaOeste(): TipoTerreno { return this.bordas[3]; }

    public temMosteiro(): boolean {
        return this.subsegmentos[12] === 'MOSTEIRO';
    }

    public obterTipoSubsegmento(idSubsegmento: number): TipoTerreno {
        return this.subsegmentos[idSubsegmento];
    }


    public obterPosicoesValidasMeeple(): number[] {
        const posicoes: number[] = [
            PosicaoSubsegmento.N2,
            PosicaoSubsegmento.L2,
            PosicaoSubsegmento.S2,
            PosicaoSubsegmento.O2
        ];
        if (this.temMosteiro()) {
            posicoes.push(PosicaoSubsegmento.CENTRO);
        }
        return posicoes;
    }


    public static subsegmentoParaBorda(idSubsegmento: number): number {
        if (idSubsegmento >= 0 && idSubsegmento <= 2) return 0;
        if (idSubsegmento >= 3 && idSubsegmento <= 5) return 1;
        if (idSubsegmento >= 6 && idSubsegmento <= 8) return 2;
        if (idSubsegmento >= 9 && idSubsegmento <= 11) return 3;
        return -1;
    }

    public static bordaParaSubsegmentoPrincipal(bordaIndex: number): number {
        switch (bordaIndex) {
            case 0: return PosicaoSubsegmento.N2;
            case 1: return PosicaoSubsegmento.L2;
            case 2: return PosicaoSubsegmento.S2;
            case 3: return PosicaoSubsegmento.O2;
            default: return PosicaoSubsegmento.CENTRO;
        }
    }


    public obterBordasConectadasInternamente(bordaIndex: number): number[] {
        const gruposBase = Tile.CONEXOES_BASE[this.tipo] || [];
        const k = Math.floor(this.rotacao / 90) % 4;

        for (const grupo of gruposBase) {
            const grupoRotacionado = grupo.map((e) => (e + k) % 4);
            if (grupoRotacionado.includes(bordaIndex)) {
                return grupoRotacionado;
            }
        }

        return [bordaIndex];
    }

    /**
     * Retorna as regiões de campo na orientação atual da peça.
     */
    public obterRegioesCampo(): RegiaoCampo[] {
        const k = Math.floor(this.rotacao / 90) % 4;
        return (Tile.CAMPOS_BASE[this.tipo] || []).map((regiao) => ({
            pontos: regiao.pontos.map((p) => (p + k * 2) % 8),
            cidades: regiao.cidades.map((e) => (e + k) % 4)
        }));
    }

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
