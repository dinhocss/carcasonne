import { Tabuleiro } from './Tabuleiro';
import { Tile } from './Tile';
import type { Meeple } from './Meeple';
import { PosicaoSubsegmento, type TipoTerreno } from './Enums';
import type { Participante } from './Participante';
import { ColocacaoInvalidaException } from './ColocacaoInvalidaException';
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
    /** Chaves "idTile:borda" de todas as bordas percorridas na estrutura. */
    bordasVisitadas: string[];
    /** Em campos, as bordas de cidade que encostam na região percorrida. */
    cidadesAdjacentes?: { tile: Tile; borda: number }[];
}

// Metade de borda do vizinho que encosta em cada metade de borda da peça
const METADE_OPOSTA = [5, 4, 7, 6, 1, 0, 3, 2];

export class TabuleiroManager {
    private static instance: TabuleiroManager | null = null;

    private tabuleiro: Tabuleiro;
    private estrategiasPontuacao: Record<TipoTerreno, IEstrategiaPontuacao>;

    private constructor() {
        this.tabuleiro = new Tabuleiro(11);

        this.estrategiasPontuacao = {
            CIDADE: new PontuacaoCidadeStrategy(),
            ESTRADA: new PontuacaoEstradaStrategy(),
            MOSTEIRO: new PontuacaoMosteiroStrategy(),
            CAMPO: new PontuacaoCampoStrategy()
        };
    }

    public static getInstance(): TabuleiroManager {
        if (!TabuleiroManager.instance) {
            TabuleiroManager.instance = new TabuleiroManager();
        }
        return TabuleiroManager.instance;
    }

    /**
     * Não está no diagrama, mas é necessário por ser Singleton:
     * descarta o tabuleiro atual e cria um novo para a próxima partida.
     */
    public reiniciar(): void {
        this.tabuleiro = new Tabuleiro(11);
    }

    public obterTabuleiro(): Tabuleiro {
        return this.tabuleiro;
    }

    // ---------------------------------------------------------------------
    // Validação de tiles
    // ---------------------------------------------------------------------

    public tabuleiroPossuiAlgumTile(): boolean {
        for (let y = 0; y < this.tabuleiro.tamanho; y++) {
            for (let x = 0; x < this.tabuleiro.tamanho; x++) {
                if (!this.tabuleiro.estaVazio(x, y)) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Valida se um Tile pode ser colocado na coordenada (x, y).
     * Regras:
     * 1. A célula deve estar vazia.
     * 2. Deve haver pelo menos uma peça vizinha adjacente (exceto a peça inicial no centro).
     * 3. TODAS as bordas que tocam vizinhos existentes devem combinar perfeitamente.
     */
    public validarPosicaoTile(tile: Tile, x: number, y: number): boolean {
        if (!this.tabuleiro.estaVazio(x, y)) {
            return false;
        }

        const temPecasNoTabuleiro = this.tabuleiroPossuiAlgumTile();
        if (!temPecasNoTabuleiro) {
            return x === 5 && y === 5;
        }

        const vizinhos = this.tabuleiro.obterTilesAdjacentes(x, y);
        if (vizinhos.length === 0) {
            return false;
        }

        return this.validarConexaoTerreno(tile, x, y);
    }

    /**
     * Mesma validação de validarPosicaoTile, mas lançando
     * ColocacaoInvalidaException com o motivo da recusa.
     */
    public exigirPosicaoTileValida(tile: Tile, x: number, y: number): void {
        if (!this.tabuleiro.estaVazio(x, y)) {
            throw new ColocacaoInvalidaException('A casa já está ocupada.');
        }
        if (this.tabuleiro.obterTilesAdjacentes(x, y).length === 0) {
            throw new ColocacaoInvalidaException('A peça precisa encostar em outra peça.');
        }
        if (!this.validarConexaoTerreno(tile, x, y)) {
            throw new ColocacaoInvalidaException('As bordas da peça não combinam com os vizinhos.');
        }
    }

    /**
     * Compara as bordas do tile com os vizinhos ortogonais existentes.
     */
    private validarConexaoTerreno(tile: Tile, x: number, y: number): boolean {
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
        if (!this.tabuleiroPossuiAlgumTile()) {
            return true;
        }

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

    // ---------------------------------------------------------------------
    // Validação de meeples
    // ---------------------------------------------------------------------

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
     * Valida a posição do Meeple lançando ColocacaoInvalidaException em caso de violação de regras.
     * Padrão GRASP Creator: TabuleiroManager atua como criador da exceção estrutural.
     */
    public exigirPosicaoMeepleValida(tile: Tile, idSubsegmento: number): void {
        if (idSubsegmento < 0 || idSubsegmento > 12) {
            throw new ColocacaoInvalidaException(`Subsegmento inválido: ${idSubsegmento}`);
        }
        if (tile.obterTodosMeeplesNoTile().length > 0) {
            throw new ColocacaoInvalidaException('Esta peça já contém um Meeple alocado.');
        }
        if (!tile.obterPosicao()) {
            throw new ColocacaoInvalidaException('A peça precisa estar posicionada no tabuleiro para receber um Meeple.');
        }
        if (idSubsegmento === PosicaoSubsegmento.CENTRO) {
            if (!tile.temMosteiro()) {
                throw new ColocacaoInvalidaException('Esta peça não possui Mosteiro no centro.');
            }
            if (tile.obterMeeple(PosicaoSubsegmento.CENTRO) !== null) {
                throw new ColocacaoInvalidaException('O Mosteiro já possui um Monge alocado.');
            }
            return;
        }
        const edgeIndex = Tile.subsegmentoParaBorda(idSubsegmento);
        if (edgeIndex === -1) {
            throw new ColocacaoInvalidaException('Subsegmento não corresponde a nenhuma borda válida.');
        }
        const terreno = tile.obterBordas()[edgeIndex];
        if (terreno === 'MOSTEIRO') {
            throw new ColocacaoInvalidaException('Mosteiro não pode ser alocado nesta borda.');
        }
        const estrutura = this.obterEstruturaConectada(tile, edgeIndex, terreno);
        if (estrutura.meeples.length > 0) {
            throw new ColocacaoInvalidaException(`A estrutura de ${terreno} já possui Meeple(s) alocado(s).`);
        }
    }

    // ---------------------------------------------------------------------
    // Estruturas conectadas
    // ---------------------------------------------------------------------

    /**
     * Explora a malha de conexões internas e de adjacência do tabuleiro para encontrar
     * todos os tiles da estrutura conectada, todos os meeples alocados e se a estrutura está fechada.
     */
    public obterEstruturaConectada(
        startTile: Tile,
        startEdge: number,
        terreno: TipoTerreno
    ): ResultadoEstrutura {
        if (terreno === 'CAMPO') {
            return this.obterCampoConectado(startTile, startEdge);
        }

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
            fechada,
            bordasVisitadas: Array.from(visitedEdges)
        };
    }

    /**
     * Percorre a região de campo que contém a borda informada. Estradas dividem o
     * campo, mas as duas metades da borda de estrada continuam sendo campo.
     */
    private obterCampoConectado(startTile: Tile, startEdge: number): ResultadoEstrutura {
        const regiaoDoPonto = (tile: Tile, ponto: number) =>
            tile.obterRegioesCampo().findIndex((r) => r.pontos.includes(ponto));

        const regiaoInicial = regiaoDoPonto(startTile, startEdge * 2);
        const fila: { tile: Tile; regiao: number }[] = regiaoInicial === -1 ? [] : [{ tile: startTile, regiao: regiaoInicial }];
        const visitadas = new Set<string>();
        const tilesMap = new Map<string, Tile>();
        const meeples: Meeple[] = [];
        const bordasVisitadas = new Set<string>();
        const cidadesAdjacentes: { tile: Tile; borda: number }[] = [];
        let fechada = true;

        while (fila.length > 0) {
            const { tile, regiao } = fila.shift()!;
            const chave = `${tile.id}:r${regiao}`;
            if (visitadas.has(chave)) continue;
            visitadas.add(chave);
            tilesMap.set(tile.id, tile);

            const dados = tile.obterRegioesCampo()[regiao];
            for (const borda of dados.cidades) {
                cidadesAdjacentes.push({ tile, borda });
            }

            for (let borda = 0; borda < 4; borda++) {
                if (tile.obterBordas()[borda] === 'CAMPO' && dados.pontos.includes(borda * 2)) {
                    bordasVisitadas.add(`${tile.id}:${borda}`);
                    for (let s = 0; s < 3; s++) {
                        const meeple = tile.obterMeeple(borda * 3 + s);
                        if (meeple && !meeples.includes(meeple)) {
                            meeples.push(meeple);
                        }
                    }
                }
            }

            const pos = tile.obterPosicao();
            if (!pos) continue;

            for (const ponto of dados.pontos) {
                const borda = Math.floor(ponto / 2);
                const dx = borda === 1 ? 1 : borda === 3 ? -1 : 0;
                const dy = borda === 0 ? -1 : borda === 2 ? 1 : 0;
                const vizinho = this.tabuleiro.obterTile(pos.x + dx, pos.y + dy);

                if (!vizinho) {
                    fechada = false;
                    continue;
                }

                const regiaoVizinha = regiaoDoPonto(vizinho, METADE_OPOSTA[ponto]);
                if (regiaoVizinha !== -1) {
                    fila.push({ tile: vizinho, regiao: regiaoVizinha });
                }
            }
        }

        return {
            tiles: Array.from(tilesMap.values()),
            meeples,
            fechada,
            bordasVisitadas: Array.from(bordasVisitadas),
            cidadesAdjacentes
        };
    }

    // ---------------------------------------------------------------------
    // Pontuação durante o jogo
    // ---------------------------------------------------------------------

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

            if (estruturasAvaliadas.has(`${tileAtual.id}:${edgeIndex}`)) {
                continue;
            }

            const estrutura = this.obterEstruturaConectada(tileAtual, edgeIndex, terreno);

            // Marca apenas as bordas desta estrutura (um tile pode ter duas
            // cidades/estradas separadas, e a segunda não pode ser ignorada)
            for (const chave of estrutura.bordasVisitadas) {
                estruturasAvaliadas.add(chave);
            }

            if (estrutura.fechada && estrutura.meeples.length > 0) {
                const pontos = this.calcularPontos(estrutura.tiles, terreno);
                this.resolverEmpate(estrutura.meeples, pontos);
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
                            const pontos = this.calcularPontos(vizinhos3x3, 'MOSTEIRO');
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

    /**
     * Calcula os pontos de uma estrutura FECHADA usando a estratégia do terreno.
     */
    private calcularPontos(tilesFechados: Tile[], tipo: TipoTerreno): number {
        return this.estrategiasPontuacao[tipo].calcularPontos(tilesFechados);
    }

    /**
     * Pontos de estruturas incompletas (fim de jogo).
     * Cidade: 1 ponto por tile + 1 por escudo. Estrada e mosteiro: 1 ponto por tile
     * (no mosteiro, a lista é o 3x3 existente: o próprio mosteiro + vizinhos).
     */
    private calcularPontosIncompletos(tiles: Tile[], tipo: TipoTerreno): number {
        if (tipo === 'CIDADE') {
            return tiles.reduce((total, t) => total + 1 + (t.temEscudo ? 1 : 0), 0);
        }
        return this.estrategiasPontuacao[tipo].calcularPontos(tiles);
    }

    /**
     * Atribui os pontos aos jogadores com maior número de Meeples na estrutura
     * (ou empatados no topo) e devolve todos os meeples para seus respectivos donos.
     */
    private resolverEmpate(meeplesEnvolvidos: Meeple[], pontosTotais: number): void {
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

        // Devolução de todos os meeples da estrutura concluída
        for (const meeple of meeplesEnvolvidos) {
            meeple.obterDono().devolverMeeple(meeple);
        }
    }

    // ---------------------------------------------------------------------
    // Pontuação de fim de jogo
    // ---------------------------------------------------------------------

    /**
     * Pontuação final: cidades, estradas e mosteiros incompletos que ainda têm
     * meeples, e todos os campos (fazendeiros). Chamar uma vez, ao fim da partida.
     */
    public pontuarFeaturesIncompletas(): void {
        const avaliadas = new Set<string>();
        const grid = this.tabuleiro.obterGrid();

        for (const linha of grid) {
            for (const tile of linha) {
                if (!tile) continue;

                // Cidades e estradas incompletas
                for (let edge = 0; edge < 4; edge++) {
                    const terreno = tile.obterBordas()[edge];
                    if (terreno !== 'CIDADE' && terreno !== 'ESTRADA') continue;
                    if (avaliadas.has(`${tile.id}:${edge}`)) continue;

                    const estrutura = this.obterEstruturaConectada(tile, edge, terreno);
                    for (const chave of estrutura.bordasVisitadas) {
                        avaliadas.add(chave);
                    }

                    if (!estrutura.fechada && estrutura.meeples.length > 0) {
                        const pontos = this.calcularPontosIncompletos(estrutura.tiles, terreno);
                        this.resolverEmpate(estrutura.meeples, pontos);
                    }
                }

                // Mosteiro incompleto: 1 ponto pelo mosteiro + 1 por peça ao redor
                const pos = tile.obterPosicao();
                if (pos && tile.temMosteiro()) {
                    const monge = tile.obterMeeple(PosicaoSubsegmento.CENTRO);
                    if (monge) {
                        const tiles3x3 = this.obterTiles3x3(pos.x, pos.y);
                        const pontos = this.calcularPontosIncompletos(tiles3x3, 'MOSTEIRO');
                        this.resolverEmpate([monge], pontos);
                    }
                }
            }
        }

        this.pontuarCampos();
    }

    /**
     * Pontua os campos que têm fazendeiros (somente no fim do jogo).
     */
    private pontuarCampos(): void {
        const avaliados = new Set<string>();

        for (const linha of this.tabuleiro.obterGrid()) {
            for (const tile of linha) {
                const pos = tile?.obterPosicao();
                if (!tile || !pos) continue;

                for (let edge = 0; edge < 4; edge++) {
                    if (tile.obterBordas()[edge] !== 'CAMPO') continue;
                    if (avaliados.has(`${tile.id}:${edge}`)) continue;

                    const campo = this.obterEstruturaConectada(tile, edge, 'CAMPO');
                    for (const chave of campo.bordasVisitadas) {
                        avaliados.add(chave);
                    }

                    if (campo.meeples.length > 0) {
                        const pontos = this.calcularPontuacaoCampo(pos.x, pos.y, edge * 3 + 1);
                        this.resolverEmpate(campo.meeples, pontos);
                    }
                }
            }
        }
    }

    /**
     * Pontos de um campo: 3 por cada cidade FECHADA adjacente ao campo que
     * contém o subsegmento (idSubsegmento) do tile em (x, y).
     */
    private calcularPontuacaoCampo(x: number, y: number, idSubsegmento: number): number {
        const tile = this.tabuleiro.obterTile(x, y);
        if (!tile) return 0;

        const edge = Tile.subsegmentoParaBorda(idSubsegmento);
        if (edge === -1 || tile.obterBordas()[edge] !== 'CAMPO') return 0;

        const campo = this.obterEstruturaConectada(tile, edge, 'CAMPO');

        const cidadesContadas = new Set<string>();
        const cidadesFechadas: Tile[] = [];

        for (const { tile: t, borda } of campo.cidadesAdjacentes ?? []) {
            if (cidadesContadas.has(`${t.id}:${borda}`)) continue;

            const cidade = this.obterEstruturaConectada(t, borda, 'CIDADE');
            for (const chave of cidade.bordasVisitadas) {
                cidadesContadas.add(chave);
            }

            if (cidade.fechada) {
                cidadesFechadas.push(t);
            }
        }

        // A estratégia de campo vale 3 pontos por item da lista
        return this.estrategiasPontuacao['CAMPO'].calcularPontos(cidadesFechadas);
    }
}