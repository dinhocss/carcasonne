import type { Tile } from './Tile';


export interface IEstrategiaPontuacao {
    calcularPontos(tilesFechados: Tile[]): number;
}

export class PontuacaoCidadeStrategy implements IEstrategiaPontuacao {
    public calcularPontos(tilesFechados: Tile[]): number {
        let pontos = 0;
        for (const tile of tilesFechados) {
            pontos += 2;
            if (tile.temEscudo) {
                pontos += 2;
            }
        }
        return pontos;
    }
}


export class PontuacaoEstradaStrategy implements IEstrategiaPontuacao {
    public calcularPontos(tilesFechados: Tile[]): number {
        return tilesFechados.length * 1;
    }
}


export class PontuacaoMosteiroStrategy implements IEstrategiaPontuacao {
    public calcularPontos(tilesFechados: Tile[]): number {
        return tilesFechados.length * 1;
    }
}


export class PontuacaoCampoStrategy implements IEstrategiaPontuacao {
    public calcularPontos(tilesFechados: Tile[]): number {
        return tilesFechados.length * 3;
    }
}