import { Posicao, PosicaoSubsegmento, type TipoTerreno } from './Enums';
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

    // Estados rigorosamente mantidos pelo Information Expert
    private bordas: [TipoTerreno, TipoTerreno, TipoTerreno, TipoTerreno]; // [Norte, Leste, Sul, Oeste]
    private subsegmentos: TipoTerreno[];
    private meeplesAlocados: (Meeple | null)[];
    private posicao: Posicao | null = null;
    private rotacao: number = 0; // 0, 90, 180, 270

    // Conexões internas base para rotação 0
    // Índices de bordas: 0 = Norte, 1 = Leste, 2 = Sul, 3 = Oeste
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
            norte, norte, norte, // 0, 1, 2 (Norte)
            leste, leste, leste, // 3, 4, 5 (Leste)
            sul,   sul,   sul,   // 6, 7, 8 (Sul)
            oeste, oeste, oeste, // 9, 10, 11 (Oeste)
            centro               // 12 (Centro)
        ];
    }

    /**
     * Rotaciona a peça em 90 graus no sentido horário.
     * Atualiza o estado da rotação, a ordem das bordas e dos subsegmentos.
     */
    public rotacionar(): void {
        this.rotacao = (this.rotacao + 90) % 360;

        // Atualização rigorosa da ordem das bordas:
        // Novo Norte = Antigo Oeste
        // Novo Leste = Antigo Norte
        // Novo Sul = Antigo Leste
        // Novo Oeste = Antigo Sul
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
    public obterBordaSul(): TipoTerreno   { return this.bordas[2]; }
    public obterBordaOeste(): TipoTerreno { return this.bordas[3]; }

    public temMosteiro(): boolean {
        return this.subsegmentos[12] === 'MOSTEIRO';
    }

    public obterTipoSubsegmento(idSubsegmento: number): TipoTerreno {
        return this.subsegmentos[idSubsegmento];
    }

    /**
     * Retorna as posições válidas de alocação de Meeple suportadas por este tile.
     */
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

    /**
     * Mapeia um subsegmento para o índice da borda correspondente (0: N, 1: L, 2: S, 3: O, -1: Centro).
     */
    public static subsegmentoParaBorda(idSubsegmento: number): number {
        if (idSubsegmento >= 0 && idSubsegmento <= 2) return 0;
        if (idSubsegmento >= 3 && idSubsegmento <= 5) return 1;
        if (idSubsegmento >= 6 && idSubsegmento <= 8) return 2;
        if (idSubsegmento >= 9 && idSubsegmento <= 11) return 3;
        return -1;
    }

    /**
     * Retorna o subsegmento representativo padrão de uma borda (N2=1, L2=4, S2=7, O2=10).
     */
    public static bordaParaSubsegmentoPrincipal(bordaIndex: number): number {
        switch (bordaIndex) {
            case 0: return PosicaoSubsegmento.N2;
            case 1: return PosicaoSubsegmento.L2;
            case 2: return PosicaoSubsegmento.S2;
            case 3: return PosicaoSubsegmento.O2;
            default: return PosicaoSubsegmento.CENTRO;
        }
    }

    /**
     * Retorna as bordas conectadas internamente na orientação atual da peça.
     */
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
