import { Tabuleiro } from './Tabuleiro';
import { Tile } from './Tile';
import type { Meeple } from './Meeple';
import type { TipoTerreno } from './Enums';
import type { Participante } from './Participante';
import {
    type IEstrategiaPontuacao,
    PontuacaoCidadeStrategy,
    PontuacaoEstradaStrategy,
    PontuacaoMosteiroStrategy,
    PontuacaoCampoStrategy
} from './EstrategiaPontuacao';

export class TabuleiroManager {
    private tabuleiro: Tabuleiro;
    private estrategiasPontuacao: Record<TipoTerreno, IEstrategiaPontuacao>;

    constructor(tabuleiro: Tabuleiro) {
        this.tabuleiro = tabuleiro;

        this.estrategiasPontuacao = {
            CIDADE: new PontuacaoCidadeStrategy(),
            ESTRADA: new PontuacaoEstradaStrategy(),
            MOSTEIRO: new PontuacaoMosteiroStrategy(),
            CAMPO: new PontuacaoCampoStrategy()
        };
    }

    public obterTabuleiro(): Tabuleiro {
        return this.tabuleiro;
    }


    public validarPosicaoTile(tile: Tile, x: number, y: number): boolean {
        if (!this.tabuleiro.estaVazio(x, y)) {
            return false;
        }

        const vizinhos = this.tabuleiro.obterTilesAdjacentes(x, y);
        if (vizinhos.length === 0) {
            return false;
        }

        return this.validarConexaoTerreno(tile, x, y);
    }


    private validarConexaoTerreno(tile: Tile, x: number, y: number): boolean {
        const vizinhoNorte = this.tabuleiro.obterTile(x, y - 1);
        if (vizinhoNorte && vizinhoNorte.obterBordaSul() !== tile.obterBordaNorte()) {
            return false;
        }

        const vizinhoLeste = this.tabuleiro.obterTile(x + 1, y);
        if (vizinhoLeste && vizinhoLeste.obterBordaOeste() !== tile.obterBordaLeste()) {
            return false;
        }

        const vizinhoSul = this.tabuleiro.obterTile(x, y + 1);
        if (vizinhoSul && vizinhoSul.obterBordaNorte() !== tile.obterBordaSul()) {
            return false;
        }

        const vizinhoOeste = this.tabuleiro.obterTile(x - 1, y);
        if (vizinhoOeste && vizinhoOeste.obterBordaLeste() !== tile.obterBordaOeste()) {
            return false;
        }

        return true;
    }


    public validarPosicaoMeeple(tile: Tile, idSubsegmento: number): boolean {
        if (idSubsegmento < 0 || idSubsegmento > 12) {
            return false;
        }

        if (tile.obterTodosMeeplesNoTile().length > 0) {
            return false;
        }

        const terrenoAlvo = tile.obterTipoSubsegmento(idSubsegmento);


        if (idSubsegmento === 12 && terrenoAlvo !== 'MOSTEIRO') {
            return false;
        }

       
        const pos = tile.obterPosicao();
        if (pos) {
            if (idSubsegmento <= 2) {
                const vizNorte = this.tabuleiro.obterTile(pos.x, pos.y - 1);
                if (vizNorte && (vizNorte.obterMeeple(6) || vizNorte.obterMeeple(7) || vizNorte.obterMeeple(8))) {
                    return false;
                }
            }
            else if (idSubsegmento >= 3 && idSubsegmento <= 5) {
                const vizLeste = this.tabuleiro.obterTile(pos.x + 1, pos.y);
                if (vizLeste && (vizLeste.obterMeeple(9) || vizLeste.obterMeeple(10) || vizLeste.obterMeeple(11))) {
                    return false;
                }
            }

            else if (idSubsegmento >= 6 && idSubsegmento <= 8) {
                const vizSul = this.tabuleiro.obterTile(pos.x, pos.y + 1);
                if (vizSul && (vizSul.obterMeeple(0) || vizSul.obterMeeple(1) || vizSul.obterMeeple(2))) {
                    return false;
                }
            }
            else if (idSubsegmento >= 9 && idSubsegmento <= 11) {
                const vizOeste = this.tabuleiro.obterTile(pos.x - 1, pos.y);
                if (vizOeste && (vizOeste.obterMeeple(3) || vizOeste.obterMeeple(4) || vizOeste.obterMeeple(5))) {
                    return false;
                }
            }
        }

        return true;
    }


    public verificarEPontuarFechamentos(tileAtual: Tile): void {
        const pos = tileAtual.obterPosicao();
        if (!pos) return;

        this.verificarMosteirosAoRedor(pos.x, pos.y);

        const vizinhos = this.tabuleiro.obterTilesAdjacentes(pos.x, pos.y);
        const grupoTiles = [tileAtual, ...vizinhos];

        for (const tipo of ['ESTRADA', 'CIDADE'] as TipoTerreno[]) {
            const tilesDoTipo = grupoTiles.filter((t) =>
                t.obterBordaNorte() === tipo ||
                t.obterBordaLeste() === tipo ||
                t.obterBordaSul() === tipo ||
                t.obterBordaOeste() === tipo
            );

            if (tilesDoTipo.length >= 2) {
                const meeplesEnvolvidos: Meeple[] = [];
                for (const t of tilesDoTipo) {
                    for (const m of t.obterTodosMeeplesNoTile()) {
                        const sub = m.obterLocalizacaoNoTile();
                        if (t.obterTipoSubsegmento(sub) === tipo) {
                            meeplesEnvolvidos.push(m);
                        }
                    }
                }

                if (meeplesEnvolvidos.length > 0) {
                    const pontos = this.calcularPontos(tilesDoTipo, tipo);
                    this.resolverEmpate(meeplesEnvolvidos, pontos);
                }
            }
        }
    }

    private verificarMosteirosAoRedor(cx: number, cy: number): void {
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const candidato = this.tabuleiro.obterTile(cx + dx, cy + dy);
                if (candidato && candidato.obterTipoSubsegmento(12) === 'MOSTEIRO') {
                    const monge = candidato.obterMeeple(12);
                    if (monge) {
                        const vizinhosMosteiro = this.obterTiles3x3(cx + dx, cy + dy);
                        if (vizinhosMosteiro.length === 9) {
                            const pontos = this.calcularPontos(vizinhosMosteiro, 'MOSTEIRO');
                            this.resolverEmpate([monge], pontos);
                        }
                    }
                }
            }
        }
    }

    private obterTiles3x3(cx: number, cy: number): Tile[] {
        const lista: Tile[] = [];
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const t = this.tabuleiro.obterTile(cx + dx, cy + dy);
                if (t) lista.push(t);
            }
        }
        return lista;
    }

    private calcularPontos(tilesFechados: Tile[], tipo: TipoTerreno): number {
        const estrategia = this.estrategiasPontuacao[tipo];
        return estrategia.calcularPontos(tilesFechados);
    }

    private resolverEmpate(meeplesEnvolvidos: Meeple[], pontosTotais: number): void {
        const contagemPorJogador = new Map<Participante, number>();

        for (const meeple of meeplesEnvolvidos) {
            const dono = meeple.obterDono();
            contagemPorJogador.set(dono, (contagemPorJogador.get(dono) || 0) + 1);
        }

        let maxMeeples = 0;
        for (const qtd of contagemPorJogador.values()) {
            if (qtd > maxMeeples) maxMeeples = qtd;
        }

        for (const [participante, qtd] of contagemPorJogador.entries()) {
            if (qtd === maxMeeples) {
                participante.adicionarPontos(pontosTotais);
            }
        }
        for (const meeple of meeplesEnvolvidos) {
            meeple.obterDono().devolverMeeple(meeple);
        }
    }
}