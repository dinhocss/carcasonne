
export class ColocacaoInvalidaException extends Error {
    private mensagem: string;

    constructor(mensagem: string) {
        super(mensagem);
        this.mensagem = mensagem;
        this.name = 'ColocacaoInvalidaException';

        Object.setPrototypeOf(this, ColocacaoInvalidaException.prototype);
    }

    public obterMensagem(): string {
        return this.mensagem;
    }
}

