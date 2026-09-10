export type TipoBorda = 'CAMPO' | 'CIDADE' | 'ESTRADA' | 'MOSTEIRO'; //Enum representando os tipos das bordas

export interface Tile{
    tipo: string;
    imagem: string;
    bordas: [TipoBorda, TipoBorda, TipoBorda, TipoBorda] //representando Norte, Sul, Leste e Oeste.
    temEscudo: boolean;
}

export interface TilePosicionado{
    id: string;
    modelo: ModeloPeca;
    x: number;
    y: number;
    rotacao: number;
}