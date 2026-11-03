import { Tabuleiro } from './Tabuleiro';
import { Tile } from './Tile';
import type { Meeple } from './Meeple';
import { PosicaoSubsegmento, type TipoTerreno } from './Enums';
import type { Participante } from './Participante';
import {
    type IEstrategiaPontuacao,
    PontuacaoCidadeStrategy,
    PontuacaoEstradaStrategy,
    PontuacaoMosteiroStrategy,
    PontuacaoCampoStrategy
} from './EstrategiaPontuacao';

export interface ResultadoEstrutura {
    tiles: Tile[];
    meeples: Meeple[];
    fechada: boolean;
}

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

    /**
     * Valida se um Tile pode ser colocado na coordenada (x, y).
     * Regras:
     * 1. A célula deve estar vazia.
     * 2. Deve haver pelo menos uma peça vizinha adjacente.
     * 3. TODAS as bordas que tocam vizinhos existentes devem combinar perfeitamente.
     */
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

    /**
     * Compara as bordas do tile com os vizinhos ortogonais existentes.
     */
    public validarConexaoTerreno(tile: Tile, x: number, y: number): boolean {
        // Vizinho Norte (y - 1) toca a borda Norte do tile com sua borda Sul
        const vizinhoNorte = this.tabuleiro.obterTile(x, y - 1);
        if (vizinhoNorte && vizinhoNorte.obterBordaSul() !== tile.obterBordaNorte()) {
            return false;
        }

        // Vizinho Leste (x + 1) toca a borda Leste do tile com sua borda Oeste
        const vizinhoLeste = this.tabuleiro.obterTile(x + 1, y);
        if (vizinhoLeste && vizinhoLeste.obterBordaOeste() !== tile.obterBordaLeste()) {
            return false;
        }

        // Vizinho Sul (y + 1) toca a borda Sul do tile com sua borda Norte
        const vizinhoSul = this.tabuleiro.obterTile(x, y + 1);
        if (vizinhoSul && vizinhoSul.obterBordaNorte() !== tile.obterBordaSul()) {
            return false;
        }

        // Vizinho Oeste (x - 1) toca a borda Oeste do tile com sua borda Leste
        const vizinhoOeste = this.tabuleiro.obterTile(x - 1, y);
        if (vizinhoOeste && vizinhoOeste.obterBordaLeste() !== tile.obterBordaOeste()) {
            return false;
        }

        return true;
    }

    /**
     * Verifica se existe QUALQUER posição válida para o Tile no tabuleiro atual,
     * testando todas as casas livres adjacentes nas 4 rotações possíveis.
     */
    public existePosicaoValidaParaTile(tile: Tile): boolean {
        const rotOriginal = tile.obterRotacao();
        const candidatos: { x: number; y: number }[] = [];

        // Coleta posições vazias que possuem ao menos um vizinho adjacente
        for (let y = 0; y < this.tabuleiro.tamanho; y++) {
            for (let x = 0; x < this.tabuleiro.tamanho; x++) {
                if (this.tabuleiro.estaVazio(x, y) && this.tabuleiro.obterTilesAdjacentes(x, y).length > 0) {
                    candidatos.push({ x, y });
                }
            }
        }

        if (candidatos.length === 0) {
            return false;
        }

        let encontrou = false;
        for (let r = 0; r < 4; r++) {
            for (const { x, y } of candidatos) {
                if (this.validarConexaoTerreno(tile, x, y)) {
                    encontrou = true;
                    break;
                }
            }
            if (encontrou) break;
            tile.rotacionar();
        }

        // Restaura rotação original
        while (tile.obterRotacao() !== rotOriginal) {
            tile.rotacionar();
        }

        return encontrou;
    }

    /**
     * Valida se um Meeple pode ser posicionado no subsegmento indicado do Tile.
     * Regras:
     * 1. O tile não pode conter outro Meeple.
     * 2. A estrutura conectada (cidade, estrada ou campo) não pode conter outro Meeple pré-existente.
     */
    public validarPosicaoMeeple(tile: Tile, idSubsegmento: number): boolean {
        if (idSubsegmento < 0 || idSubsegmento > 12) {
            return false;
        }

        // Apenas 1 meeple por peça recém-colocada
        if (tile.obterTodosMeeplesNoTile().length > 0) {
            return false;
        }

        const pos = tile.obterPosicao();
        if (!pos) {
            return false;
        }

        // Caso Centro: Mosteiro
        if (idSubsegmento === PosicaoSubsegmento.CENTRO) {
            return tile.temMosteiro() && tile.obterMeeple(PosicaoSubsegmento.CENTRO) === null;
        }

        const edgeIndex = Tile.subsegmentoParaBorda(idSubsegmento);
        if (edgeIndex === -1) {
            return false;
        }

        const terreno = tile.obterBordas()[edgeIndex];
        if (terreno === 'MOSTEIRO') {
            return false;
        }

        // Percorre toda a estrutura conectada para garantir que nenhum Meeple já esteja nela
        const estrutura = this.obterEstruturaConectada(tile, edgeIndex, terreno);
        return estrutura.meeples.length === 0;
    }

    /**
     * Explora a malha de conexões internas e de adjacência do tabuleiro para encontrar
     * todos os tiles da estrutura conectada, todos os meeples alocados e se a estrutura está fechada.
     */
    public obterEstruturaConectada(
        startTile: Tile,
        startEdge: number,
        terreno: TipoTerreno
    ): ResultadoEstrutura {
        const queue: { tile: Tile; edgeIndex: number }[] = [{ tile: startTile, edgeIndex: startEdge }];
        const visitedEdges = new Set<string>();
        const tilesMap = new Map<string, Tile>();
        const meeplesList: Meeple[] = [];
        let fechada = true;

        while (queue.length > 0) {
            const { tile, edgeIndex } = queue.shift()!;
            const edgeKey = `${tile.id}:${edgeIndex}`;
            if (visitedEdges.has(edgeKey)) {
                continue;
            }
            visitedEdges.add(edgeKey);
            tilesMap.set(tile.id, tile);

            // Coleta meeples alocados nesta borda do tile
            const subBase = edgeIndex * 3;
            for (let s = 0; s < 3; s++) {
                const meeple = tile.obterMeeple(subBase + s);
                if (meeple && !meeplesList.includes(meeple)) {
                    meeplesList.push(meeple);
                }
            }

            // 1. Conexões internas no mesmo tile
            const connectedEdgesOnSameTile = tile.obterBordasConectadasInternamente(edgeIndex);
            for (const otherEdge of connectedEdgesOnSameTile) {
                const otherKey = `${tile.id}:${otherEdge}`;
                if (!visitedEdges.has(otherKey)) {
                    queue.push({ tile, edgeIndex: otherEdge });
                }
            }

            // 2. Conexão externa com o vizinho adjacente
            const pos = tile.obterPosicao();
            if (!pos) continue;

            let dx = 0;
            let dy = 0;
            if (edgeIndex === 0) dy = -1; // Norte
            else if (edgeIndex === 1) dx = 1; // Leste
            else if (edgeIndex === 2) dy = 1; // Sul
            else if (edgeIndex === 3) dx = -1; // Oeste

            const oppositeEdge = (edgeIndex + 2) % 4;
            const neighbor = this.tabuleiro.obterTile(pos.x + dx, pos.y + dy);

            if (!neighbor) {
                // Borda aberta para espaço vazio: estrutura incompleta
                fechada = false;
            } else {
                // Se o vizinho compartilha o mesmo terreno na borda correspondente
                if (neighbor.obterBordas()[oppositeEdge] === terreno) {
                    const neighborKey = `${neighbor.id}:${oppositeEdge}`;
                    if (!visitedEdges.has(neighborKey)) {
                        queue.push({ tile: neighbor, edgeIndex: oppositeEdge });
                    }
                }
            }
        }

        return {
            tiles: Array.from(tilesMap.values()),
            meeples: meeplesList,
            fechada
        };
    }

    /**
     * Verifica e pontua fechamentos de Mosteiros, Cidades e Estradas resultantes
     * do último tile posicionado.
     */
    public verificarEPontuarFechamentos(tileAtual: Tile): void {
        const pos = tileAtual.obterPosicao();
        if (!pos) return;

        // 1. Verificar Mosteiros (no próprio tile ou nos 8 vizinhos ao redor)
        this.verificarMosteirosAoRedor(pos.x, pos.y);

        // 2. Verificar Estradas e Cidades conectadas ao tile recém-colocado
        const estruturasAvaliadas = new Set<string>();

        for (let edgeIndex = 0; edgeIndex < 4; edgeIndex++) {
            const terreno = tileAtual.obterBordas()[edgeIndex];
            if (terreno !== 'CIDADE' && terreno !== 'ESTRADA') {
                continue;
            }

            const chaveAvaliador = `${tileAtual.id}:${edgeIndex}`;
            if (estruturasAvaliadas.has(chaveAvaliador)) {
                continue;
            }

            const estrutura = this.obterEstruturaConectada(tileAtual, edgeIndex, terreno);

            // Marca todas as bordas dos tiles da estrutura para evitar pontuação duplicada
            for (const t of estrutura.tiles) {
                for (let e = 0; e < 4; e++) {
                    estruturasAvaliadas.add(`${t.id}:${e}`);
                }
            }

            if (estrutura.fechada && estrutura.meeples.length > 0) {
                const estrategia = this.estrategiasPontuacao[terreno];
                const pontos = estrategia.calcularPontos(estrutura.tiles);
                this.distribuirPontosEDevolverMeeples(estrutura.meeples, pontos);
            }
        }
    }

    /**
     * Verifica mosteiros no quadrado 3x3 centrado em (cx, cy).
     */
    private verificarMosteirosAoRedor(cx: number, cy: number): void {
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const mx = cx + dx;
                const my = cy + dy;
                const candidato = this.tabuleiro.obterTile(mx, my);

                if (candidato && candidato.temMosteiro()) {
                    const monge = candidato.obterMeeple(PosicaoSubsegmento.CENTRO);
                    if (monge) {
                        const vizinhos3x3 = this.obterTiles3x3(mx, my);
                        if (vizinhos3x3.length === 9) {
                            const pontos = this.estrategiasPontuacao['MOSTEIRO'].calcularPontos(vizinhos3x3);
                            this.distribuirPontosEDevolverMeeples([monge], pontos);
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

    /**
     * Atribui os pontos aos jogadores com maior número de Meeples na estrutura
     * (ou empatados no topo) e devolve todos os meeples para seus respectivos donos.
     */
    private distribuirPontosEDevolverMeeples(meeplesEnvolvidos: Meeple[], pontosTotais: number): void {
        if (meeplesEnvolvidos.length === 0) return;

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

        // Devolução rigorosa de todos os meeples da estrutura concluída
        for (const meeple of meeplesEnvolvidos) {
            meeple.obterDono().devolverMeeple(meeple);
        }
    }
}
