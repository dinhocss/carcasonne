import { Meeple } from './Meeple';
import { Posicao } from './Enums';
import type { Tile } from './Tile';
import { TabuleiroManager } from './TabuleiroManager';

// ---------------------------------------------------------------------------
// StatusParticipante (diagrama): ATIVO | DESISTIDO
// ---------------------------------------------------------------------------
export type StatusParticipante = 'ATIVO' | 'DESISTIDO';

// ---------------------------------------------------------------------------
// Padrão GoF Strategy: EstrategiaIA
// ---------------------------------------------------------------------------
export interface EstrategiaIA {
    readonly nome: string;

    /**
     * Escolhe onde posicionar o tile. Pode girar o tile (rotacionar) até
     * encontrar a posição ideal conforme a política da estratégia.
     * Retorna null se nenhuma posição servir.
     */
    escolherPosicao(tile: Tile, tabuleiroManager: TabuleiroManager): Posicao | null;

    /**
     * Decide se vale a pena colocar um meeple após o tile já ter sido posicionado.
     */
    decidirMeeple(tile: Tile, tabuleiroManager: TabuleiroManager): boolean;

    /**
     * Escolhe em qual subsegmento do tile colocar o meeple.
     * Retorna null se não houver subsegmento adequado.
     */
    escolherSubsegmentoMeeple(tile: Tile, tabuleiroManager: TabuleiroManager): number | null;
}

/**
 * Estratégia Fácil / Padrão (Primeira Válida):
 * - Seleciona a primeira posição válida encontrada no tabuleiro varrendo as coordenadas.
 * - Posiciona meeple na primeira oportunidade válida disponível.
 */
export class EstrategiaIAPrimeiraValida implements EstrategiaIA {
    public readonly nome = 'Fácil (Primeira Válida)';

    public escolherPosicao(tile: Tile, tabuleiroManager: TabuleiroManager): Posicao | null {
        const tamanho = tabuleiroManager.obterTabuleiro().tamanho;

        for (let rot = 0; rot < 4; rot++) {
            for (let y = 0; y < tamanho; y++) {
                for (let x = 0; x < tamanho; x++) {
                    if (tabuleiroManager.validarPosicaoTile(tile, x, y)) {
                        return new Posicao(x, y);
                    }
                }
            }
            tile.rotacionar();
        }
        return null;
    }

    public decidirMeeple(tile: Tile, tabuleiroManager: TabuleiroManager): boolean {
        return this.escolherSubsegmentoMeeple(tile, tabuleiroManager) !== null;
    }

    public escolherSubsegmentoMeeple(tile: Tile, tabuleiroManager: TabuleiroManager): number | null {
        for (const subId of tile.obterPosicoesValidasMeeple()) {
            const terreno = tile.obterTipoSubsegmento(subId);
            if (
                (terreno === 'MOSTEIRO' || terreno === 'CIDADE' || terreno === 'ESTRADA') &&
                tabuleiroManager.validarPosicaoMeeple(tile, subId)
            ) {
                return subId;
            }
        }
        return null;
    }
}

/**
 * Estratégia Agressiva / Ofensiva:
 * - Prioriza posições que conectem ou expandam Cidades e peças com emblema/escudo.
 * - Aloca meeples prioritariamente em Cidades (maior valor por peça) e Mosteiros.
 */
export class EstrategiaIAAgressiva implements EstrategiaIA {
    public readonly nome = 'Agressiva (Foco em Cidades e Pontos)';

    public escolherPosicao(tile: Tile, tabuleiroManager: TabuleiroManager): Posicao | null {
        const tamanho = tabuleiroManager.obterTabuleiro().tamanho;
        let melhorPosicao: Posicao | null = null;
        let melhorRotacao = 0;
        let maiorPontuacaoPotencial = -1;

        for (let rot = 0; rot < 4; rot++) {
            for (let y = 0; y < tamanho; y++) {
                for (let x = 0; x < tamanho; x++) {
                    if (tabuleiroManager.validarPosicaoTile(tile, x, y)) {
                        // Calcula atratividade: vizinhos com cidade ou escudo têm prioridade
                        const vizinhos = tabuleiroManager.obterTabuleiro().obterTilesAdjacentes(x, y);
                        let peso = vizinhos.length;
                        if (tile.temEscudo) peso += 5;
                        for (const v of vizinhos) {
                            if (v.temEscudo) peso += 3;
                            if (v.obterBordas().includes('CIDADE')) peso += 2;
                        }

                        if (peso > maiorPontuacaoPotencial) {
                            maiorPontuacaoPotencial = peso;
                            melhorPosicao = new Posicao(x, y);
                            melhorRotacao = rot;
                        }
                    }
                }
            }
            if (melhorPosicao && maiorPontuacaoPotencial >= 5 && melhorRotacao === rot) {
                return melhorPosicao;
            }
            tile.rotacionar();
        }

        // Após 4 giros a peça voltou ao início: reaplica a rotação da melhor posição
        for (let i = 0; i < melhorRotacao; i++) {
            tile.rotacionar();
        }

        return melhorPosicao;
    }

    public decidirMeeple(tile: Tile, tabuleiroManager: TabuleiroManager): boolean {
        return this.escolherSubsegmentoMeeple(tile, tabuleiroManager) !== null;
    }

    public escolherSubsegmentoMeeple(tile: Tile, tabuleiroManager: TabuleiroManager): number | null {
        const posicoes = tile.obterPosicoesValidasMeeple();
        // Ordem agressiva: CIDADE primeiro, depois MOSTEIRO, depois ESTRADA
        const ordemPreferencia = ['CIDADE', 'MOSTEIRO', 'ESTRADA'];

        for (const tipo of ordemPreferencia) {
            for (const subId of posicoes) {
                if (tile.obterTipoSubsegmento(subId) === tipo && tabuleiroManager.validarPosicaoMeeple(tile, subId)) {
                    return subId;
                }
            }
        }
        return null;
    }
}

/**
 * Estratégia Defensiva:
 * - Prioriza fechamentos rápidos e seguros (estradas e mosteiros cercados).
 * - Conserva meeples caso o participante tenha poucos disponíveis.
 */
export class EstrategiaIADefensiva implements EstrategiaIA {
    public readonly nome = 'Defensiva (Fechamentos Rápidos e Economia)';

    public escolherPosicao(tile: Tile, tabuleiroManager: TabuleiroManager): Posicao | null {
        const tamanho = tabuleiroManager.obterTabuleiro().tamanho;
        let melhorPosicao: Posicao | null = null;
        let melhorRotacao = 0;
        let maxVizinhos = -1;

        for (let rot = 0; rot < 4; rot++) {
            for (let y = 0; y < tamanho; y++) {
                for (let x = 0; x < tamanho; x++) {
                    if (tabuleiroManager.validarPosicaoTile(tile, x, y)) {
                        const vizinhos = tabuleiroManager.obterTabuleiro().obterTilesAdjacentes(x, y);
                        // Defensiva prefere áreas mais densas/fechadas
                        if (vizinhos.length > maxVizinhos) {
                            maxVizinhos = vizinhos.length;
                            melhorPosicao = new Posicao(x, y);
                            melhorRotacao = rot;
                        }
                    }
                }
            }
            if (melhorPosicao && maxVizinhos >= 3 && melhorRotacao === rot) {
                return melhorPosicao;
            }
            tile.rotacionar();
        }

        // Após 4 giros a peça voltou ao início: reaplica a rotação da melhor posição
        for (let i = 0; i < melhorRotacao; i++) {
            tile.rotacionar();
        }

        return melhorPosicao;
    }

    public decidirMeeple(tile: Tile, tabuleiroManager: TabuleiroManager): boolean {
        return this.escolherSubsegmentoMeeple(tile, tabuleiroManager) !== null;
    }

    public escolherSubsegmentoMeeple(tile: Tile, tabuleiroManager: TabuleiroManager): number | null {
        const posicoes = tile.obterPosicoesValidasMeeple();
        // Defensiva prioriza mosteiros (fechamento rápido) e estradas
        const ordemPreferencia = ['MOSTEIRO', 'ESTRADA', 'CIDADE'];

        for (const tipo of ordemPreferencia) {
            for (const subId of posicoes) {
                if (tile.obterTipoSubsegmento(subId) === tipo && tabuleiroManager.validarPosicaoMeeple(tile, subId)) {
                    return subId;
                }
            }
        }
        return null;
    }
}

// ---------------------------------------------------------------------------
// Participante (GRASP Information Expert & Creator de seus Meeples)
// ---------------------------------------------------------------------------
export abstract class Participante {
    private nome: string;
    private cor: string;
    private pontuacao: number = 0;
    private desistente: boolean = false;
    private meeples: Meeple[] = [];

    constructor(nome: string, cor: string) {
        this.nome = nome;
        this.cor = cor;
        this.inicializarMeeples();
    }

    /**
     * Padrão GRASP Creator: Participante cria e compõe seus próprios 7 objetos Meeple.
     */
    private inicializarMeeples(): void {
        this.meeples = [];
        for (let i = 0; i < 7; i++) {
            this.meeples.push(new Meeple(this));
        }
    }

    public temMeepleDisponivel(): boolean {
        return this.meeples.some((m) => m.estaDisponivel());
    }

    public pegarMeeple(): Meeple | null {
        const disponivel = this.meeples.find((m) => m.estaDisponivel());
        return disponivel || null;
    }

    public devolverMeeple(meeple: Meeple): void {
        meeple.desalocarMeeple();
    }

    public obterQuantidadeMeeplesDisponiveis(): number {
        return this.meeples.filter((m) => m.estaDisponivel()).length;
    }

    public adicionarPontos(pontos: number): void {
        this.pontuacao += pontos;
    }

    // --- Status (desistência) ------------------------------------------------

    public marcarComoDesistente(): void {
        this.desistente = true;
        // Padrão GRASP: Se um participante desiste, desaloca todos os seus meeples em jogo
        for (const meeple of this.meeples) {
            meeple.desalocarMeeple();
        }
    }

    public estaAtivo(): boolean {
        return !this.desistente;
    }

    public obterStatus(): StatusParticipante {
        return this.desistente ? 'DESISTIDO' : 'ATIVO';
    }

    // --- Getters ---------------------------------------------------------------

    public obterNome(): string {
        return this.nome;
    }

    public definirNome(nome: string): void {
        this.nome = nome;
    }

    public obterCor(): string {
        return this.cor;
    }

    public obterPontuacao(): number {
        return this.pontuacao;
    }

    public obterMeeples(): Meeple[] {
        return [...this.meeples];
    }

    public abstract ehAutomatico(): boolean;
}

// ---------------------------------------------------------------------------
// Jogador Humano
// ---------------------------------------------------------------------------
export class Jogador extends Participante {
    constructor(nome: string, cor: string) {
        super(nome, cor);
    }

    public ehAutomatico(): boolean {
        return false;
    }
}

// ---------------------------------------------------------------------------
// IA (GoF Strategy: delega tomada de decisão para a EstrategiaIA)
// ---------------------------------------------------------------------------
export class IA extends Participante {
    private estrategia: EstrategiaIA;

    constructor(nome: string, cor: string, estrategia?: EstrategiaIA) {
        super(nome, cor);
        this.estrategia = estrategia ?? new EstrategiaIAPrimeiraValida();
    }

    public ehAutomatico(): boolean {
        return true;
    }

    public definirEstrategia(estrategia: EstrategiaIA): void {
        this.estrategia = estrategia;
    }

    public obterEstrategia(): EstrategiaIA {
        return this.estrategia;
    }

    /**
     * Padrão Strategy: Executa a decisão de jogada delegando para a estratégia associada.
     */
    public decidirJogada(tile: Tile, tabuleiroManager?: TabuleiroManager): Posicao | null {
        const mgr = tabuleiroManager ?? TabuleiroManager.getInstance();
        return this.estrategia.escolherPosicao(tile, mgr);
    }

    /**
     * Padrão Strategy: Executa a decisão de meeple delegando para a estratégia associada.
     */
    public decidirMeeple(tile: Tile, tabuleiroManager?: TabuleiroManager): number | null {
        if (!this.temMeepleDisponivel()) return null;
        const mgr = tabuleiroManager ?? TabuleiroManager.getInstance();
        if (!this.estrategia.decidirMeeple(tile, mgr)) return null;
        return this.estrategia.escolherSubsegmentoMeeple(tile, mgr);
    }
}
