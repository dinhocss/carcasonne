export type TipoTerreno = 'CAMPO' | 'CIDADE' | 'ESTRADA' | 'MOSTEIRO';

export type TipoMeeple = 'FAZENDEIRO' | 'CAVALEIRO' | 'LADRAO' | 'MONGE';

export const PosicaoSubsegmento = {
    N1: 0, N2: 1, N3: 2,
    L1: 3, L2: 4, L3: 5,
    S1: 6, S2: 7, S3: 8,
    O1: 9, O2: 10, O3: 11,
    CENTRO: 12
} as const;

export type PosicaoSubsegmento = (typeof PosicaoSubsegmento)[keyof typeof PosicaoSubsegmento];

export class Posicao {
    public readonly x: number;
    public readonly y: number;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }
}
