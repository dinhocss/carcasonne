export type TipoBorda = 'CAMPO' | 'CIDADE' | 'ESTRADA' | 'MOSTEIRO'; //Enum representando os tipos das bordas

export interface Tile{
    tipo: string;
    imagem: string;
    bordas: [TipoBorda, TipoBorda, TipoBorda, TipoBorda] //representando Norte, Leste, Sul e Oeste. (sentido horário)
    temEscudo: boolean;
}

export interface TilePosicionado{
    id: string;
    modelo: Tile;
    x: number;
    y: number;
    rotacao: number;
}