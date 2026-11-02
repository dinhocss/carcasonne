import { Meeple } from './Meeple';

export abstract class Participante {
    private nome: string;
    private cor: string;
    private pontuacao: number = 0;
    private meeples: Meeple[] = [];

    constructor(nome: string, cor: string) {
        this.nome = nome;
        this.cor = cor;
        this.inicializarMeeples();
    }

    private inicializarMeeples(): void {
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

    public obterNome(): string {
        return this.nome;
    }

    public obterCor(): string {
        return this.cor;
    }

    public obterPontuacao(): number {
        return this.pontuacao;
    }


    public abstract ehAutomatico(): boolean;
}

export class Jogador extends Participante {
    constructor(nome: string, cor: string) {
        super(nome, cor);
    }

    public ehAutomatico(): boolean {
        return false;
    }
}

export class IA extends Participante {
    constructor(nome: string, cor: string) {
        super(nome, cor);
    }

    public ehAutomatico(): boolean {
        return true;
    }
}