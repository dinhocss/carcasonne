import { useEffect, useMemo, useState } from 'react';
import './style.css';
import { CarcasonneFacade } from './models/CarcasonneFacade';
import type { IGameObserver } from './models/GameManager';
import { PosicaoSubsegmento, type TipoTerreno } from './models/Enums';
import {
    EstrategiaIAPrimeiraValida,
    EstrategiaIAAgressiva,
    EstrategiaIADefensiva,
    type EstrategiaIA
} from './models/Participante';

// Converte o terreno no nome da profissão do Meeple para ajudar o jogador na tela
function nomeProfissao(terreno: TipoTerreno): string {
    switch (terreno) {
        case 'CIDADE': return 'Cavaleiro';
        case 'ESTRADA': return 'Ladrão';
        case 'CAMPO': return 'Fazendeiro';
        case 'MOSTEIRO': return 'Monge';
    }
}

// Calcula onde desenhar a bolinha do Meeple dentro do quadrado 64x64 da peça
function obterEstiloPosicaoMeeple(idSubsegmento: number): React.CSSProperties {
    if (idSubsegmento <= 2) return { top: '4px', left: '50%', transform: 'translateX(-50%)' };
    if (idSubsegmento <= 5) return { right: '4px', top: '50%', transform: 'translateY(-50%)' };
    if (idSubsegmento <= 8) return { bottom: '4px', left: '50%', transform: 'translateX(-50%)' };
    if (idSubsegmento <= 11) return { left: '4px', top: '50%', transform: 'translateY(-50%)' };
    return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
}

export function App() {
    // Padrão GoF Facade & GRASP Controller: UI se comunica exclusivamente com a CarcasonneFacade
    const facade = useMemo(() => new CarcasonneFacade(), []);
    const [, setTick] = useState(0);
    const [menuFechado, setMenuFechado] = useState(false);
    const [tipoEstrategiaIA, setTipoEstrategiaIA] = useState<'FACIL' | 'AGRESSIVA' | 'DEFENSIVA'>('FACIL');
    const [tipoEstrategiaIA2, setTipoEstrategiaIA2] = useState<'FACIL' | 'AGRESSIVA' | 'DEFENSIVA'>('AGRESSIVA');
    const [quantidadeJogadores, setQuantidadeJogadores] = useState(2);

    useEffect(() => {
        const observadorDaTela: IGameObserver = {
            aoAtualizarJogo: () => {
                setTick((t) => t + 1);
            }
        };

        facade.adicionarObservador(observadorDaTela);
        facade.iniciarNovaPartida(['Jogador 1 (Você)', 'Jogador 2']);

        return () => {
            facade.removerObservador(observadorDaTela);
        };
    }, [facade]);

    const obterInstanciaEstrategiaIA = (tipo = tipoEstrategiaIA): EstrategiaIA => {
        switch (tipo) {
            case 'AGRESSIVA': return new EstrategiaIAAgressiva();
            case 'DEFENSIVA': return new EstrategiaIADefensiva();
            default: return new EstrategiaIAPrimeiraValida();
        }
    };

    const iniciarJogoComHumanos = () => {
        const nomes = Array.from({ length: quantidadeJogadores }, (_, i) => `Jogador ${i + 1}`);
        facade.iniciarNovaPartida(nomes);
    };

    const iniciarIAContraIA = () => {
        facade.iniciarPartidaIAContraIA(
            [`Bot 1 (${tipoEstrategiaIA})`, `Bot 2 (${tipoEstrategiaIA2})`],
            [obterInstanciaEstrategiaIA(tipoEstrategiaIA), obterInstanciaEstrategiaIA(tipoEstrategiaIA2)]
        );
    };

    const iniciarJogoComIA = () => {
        facade.iniciarPartidaContraIA(
            'Jogador 1 (Você)',
            `Bot Carcassonne (${tipoEstrategiaIA})`,
            obterInstanciaEstrategiaIA()
        );
    };

    const tabuleiro = facade.obterTabuleiro();
    const grid = tabuleiro.obterGrid();
    const participantes = facade.obterParticipantes();
    const jogadorAtual = facade.obterJogadorAtual();
    const tileEmMaos = facade.obterTileAtual();
    const ultimoTile = facade.obterUltimoTilePosicionado();
    const faseAtual = facade.obterFaseAtual();
    const jogoFinalizado = facade.estaFinalizada();
    const partidaSomenteIA = facade.ehPartidaSomenteIA();
    const vencedores = jogoFinalizado ? facade.obterVencedores() : [];

    // Em IA contra IA, executa um turno por vez para mostrar cada jogada
    useEffect(() => {
        if (!partidaSomenteIA || jogoFinalizado) return;

        const temporizador = setInterval(() => facade.executarTurnoIA(), 400);
        return () => clearInterval(temporizador);
    }, [facade, partidaSomenteIA, jogoFinalizado]);

    // Opções de subsegmentos válidos para colocar o Meeple
    const opcoesMeepleDisponiveis = ultimoTile
        ? [
              {
                  label: `⬆️ Norte: ${ultimoTile.obterBordaNorte()} (${nomeProfissao(ultimoTile.obterBordaNorte())})`,
                  id: PosicaoSubsegmento.N2
              },
              {
                  label: `➡️ Leste: ${ultimoTile.obterBordaLeste()} (${nomeProfissao(ultimoTile.obterBordaLeste())})`,
                  id: PosicaoSubsegmento.L2
              },
              {
                  label: `⬇️ Sul: ${ultimoTile.obterBordaSul()} (${nomeProfissao(ultimoTile.obterBordaSul())})`,
                  id: PosicaoSubsegmento.S2
              },
              {
                  label: `⬅️ Oeste: ${ultimoTile.obterBordaOeste()} (${nomeProfissao(ultimoTile.obterBordaOeste())})`,
                  id: PosicaoSubsegmento.O2
              },
              ...(ultimoTile.temMosteiro()
                  ? [{ label: '⛪ Centro: MOSTEIRO (Monge)', id: PosicaoSubsegmento.CENTRO }]
                  : [])
          ]
        : [];

    return (
        <div className="app-container">
            <button
                id="btn-toggle-menu"
                className="btn-menu"
                onClick={() => setMenuFechado(!menuFechado)}
            >
                ☰
            </button>

            {/* Lado Esquerdo: O Tabuleiro */}
            <div className="area-jogo">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                    <h1 style={{ marginBottom: '4px', fontSize: '24px' }}>
                        🏰 Carcassonne (Padrões GRASP & GoF)
                    </h1>
                </div>

                <p style={{ marginBottom: '12px', color: '#ffd166', fontWeight: 'bold', fontSize: '14px' }}>
                    {facade.obterMensagemStatus()}
                </p>

                {jogoFinalizado && (
                    <div
                        style={{
                            backgroundColor: '#2a9d8f',
                            color: '#fff',
                            padding: '12px 16px',
                            borderRadius: '8px',
                            marginBottom: '12px',
                            boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
                        }}
                    >
                        <h3 style={{ margin: '0 0 4px 0' }}>🎉 Partida Encerrada!</h3>
                        <p style={{ margin: 0 }}>
                            Vencedor(es):{' '}
                            <strong>{vencedores.map((v) => `${v.obterNome()} (${v.obterPontuacao()} pontos)`).join(', ')}</strong>
                        </p>
                    </div>
                )}

                <div
                    className="grid-tabuleiro"
                    style={{
                        gridTemplateColumns: `repeat(${tabuleiro.tamanho}, 64px)`
                    }}
                >
                    {grid.map((linha, y) =>
                        linha.map((tile, x) => {
                            const meeplesNoTile = tile ? tile.obterTodosMeeplesNoTile() : [];
                            const ehUltimoColocado = tile && ultimoTile && tile.id === ultimoTile.id;

                            return (
                                <div
                                    key={`${x}-${y}`}
                                    className="celula"
                                    style={{
                                        width: '64px',
                                        height: '64px',
                                        position: 'relative',
                                        border: ehUltimoColocado
                                            ? '2px solid #ffd166'
                                            : tile
                                            ? 'none'
                                            : '1px dashed rgba(255,255,255,0.15)',
                                        cursor: faseAtual === 'POSICIONAR_TILE' && !tile ? 'pointer' : 'default'
                                    }}
                                    onClick={() => {
                                        if (faseAtual === 'POSICIONAR_TILE') {
                                            // Padrão Facade: executa ação através da fachada
                                            facade.posicionarTile(x, y);
                                        }
                                    }}
                                    title={`Coordenada (${x}, ${y})`}
                                >
                                    {tile && (
                                        <>
                                            <img
                                                src={tile.imagem}
                                                alt={tile.tipo}
                                                style={{
                                                    transform: `rotate(${tile.obterRotacao()}deg)`
                                                }}
                                            />
                                            {meeplesNoTile.map((m, idx) => (
                                                <div
                                                    key={idx}
                                                    title={`${m.obterTipoMeeple()} de ${m.obterDono().obterNome()}`}
                                                    style={{
                                                        position: 'absolute',
                                                        width: '16px',
                                                        height: '16px',
                                                        borderRadius: '50%',
                                                        backgroundColor: m.obterDono().obterCor(),
                                                        border: '2px solid #fff',
                                                        boxShadow: '0 0 6px #000',
                                                        zIndex: 10,
                                                        ...obterEstiloPosicaoMeeple(m.obterLocalizacaoNoTile())
                                                    }}
                                                />
                                            ))}
                                        </>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Lado Direito: Menu Lateral com Padrões GoF e GRASP */}
            <div className={`sidebar ${menuFechado ? 'fechada' : ''}`} id="menu-lateral">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px', paddingRight: '45px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            className="btn"
                            style={{ flex: 1, padding: '8px', fontSize: '12px' }}
                            onClick={iniciarJogoComHumanos}
                        >
                            👥 {quantidadeJogadores} Jogadores
                        </button>
                        <button
                            className="btn"
                            style={{ flex: 1, padding: '8px', fontSize: '12px' }}
                            onClick={iniciarJogoComIA}
                        >
                            🤖 Contra IA
                        </button>
                    </div>
                    <button
                        className="btn"
                        style={{ padding: '8px', fontSize: '12px' }}
                        onClick={iniciarIAContraIA}
                    >
                        🤖⚔️🤖 IA contra IA
                    </button>

                    <div style={{ backgroundColor: '#1e1e24', padding: '8px', borderRadius: '6px' }}>
                        <label style={{ fontSize: '11px', color: '#ffd166', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>
                            👥 Quantidade de jogadores:
                        </label>
                        <select
                            aria-label="Quantidade de jogadores"
                            style={{ width: '100%', padding: '6px', backgroundColor: '#2d3142', color: '#fff', border: '1px solid #4f5d75', borderRadius: '4px', fontSize: '12px' }}
                            value={quantidadeJogadores}
                            onChange={(e) => setQuantidadeJogadores(Number(e.target.value))}
                        >
                            <option value={2}>2 jogadores</option>
                            <option value={3}>3 jogadores</option>
                            <option value={4}>4 jogadores</option>
                            <option value={5}>5 jogadores</option>
                        </select>
                    </div>

                    {/* GoF Strategy: Seleção da Estratégia de Tomada de Decisão da IA */}
                    <div style={{ backgroundColor: '#1e1e24', padding: '8px', borderRadius: '6px' }}>
                        <label style={{ fontSize: '11px', color: '#ffd166', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>
                            🧠 GoF Strategy da IA:
                        </label>
                        <select
                            style={{ width: '100%', padding: '6px', backgroundColor: '#2d3142', color: '#fff', border: '1px solid #4f5d75', borderRadius: '4px', fontSize: '12px' }}
                            value={tipoEstrategiaIA}
                            onChange={(e) => setTipoEstrategiaIA(e.target.value as any)}
                        >
                            <option value="FACIL">Estratégia Fácil (Primeira Válida)</option>
                            <option value="AGRESSIVA">Estratégia Agressiva (Cidades e Escudos)</option>
                            <option value="DEFENSIVA">Estratégia Defensiva (Fechamentos Rápidos)</option>
                        </select>
                        <label style={{ fontSize: '11px', color: '#ffd166', fontWeight: 'bold', display: 'block', margin: '8px 0 4px 0' }}>
                            🧠 Segunda IA (IA contra IA):
                        </label>
                        <select
                            aria-label="Estratégia da segunda IA"
                            style={{ width: '100%', padding: '6px', backgroundColor: '#2d3142', color: '#fff', border: '1px solid #4f5d75', borderRadius: '4px', fontSize: '12px' }}
                            value={tipoEstrategiaIA2}
                            onChange={(e) => setTipoEstrategiaIA2(e.target.value as 'FACIL' | 'AGRESSIVA' | 'DEFENSIVA')}
                        >
                            <option value="FACIL">Estratégia Fácil (Primeira Válida)</option>
                            <option value="AGRESSIVA">Estratégia Agressiva (Cidades e Escudos)</option>
                            <option value="DEFENSIVA">Estratégia Defensiva (Fechamentos Rápidos)</option>
                        </select>
                    </div>
                </div>

                <h2 style={{ fontSize: '18px', margin: '4px 0 8px 0' }}>Participantes</h2>
                {participantes.map((p, index) => {
                    const ehVezDele = p === jogadorAtual && !jogoFinalizado;
                    const ativo = p.estaAtivo();

                    return (
                        <div
                            key={index}
                            className="card-jogador"
                            style={{
                                padding: '10px 12px',
                                marginBottom: '8px',
                                borderLeft: `5px solid ${p.obterCor()}`,
                                outline: ehVezDele ? '2px solid #ffffff' : 'none',
                                opacity: ativo ? 1 : 0.5
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ margin: '0 0 4px 0', fontSize: '15px' }}>
                                    {p.obterNome()} {ehVezDele && '⬅️'} {!ativo && '(Desistiu)'}
                                </h3>
                                {ativo && participantes.length > 1 && !jogoFinalizado && (
                                    <button
                                        style={{ background: 'none', border: 'none', color: '#e76f51', cursor: 'pointer', fontSize: '11px' }}
                                        onClick={() => facade.removerParticipante(p)}
                                        title="Desistir da partida"
                                    >
                                        Desistir
                                    </button>
                                )}
                            </div>
                            <p style={{ margin: 0, fontSize: '13px' }}>
                                🏆 Pontos: <strong>{p.obterPontuacao()}</strong> | 🧍 Meeples:{' '}
                                <strong>{p.obterQuantidadeMeeplesDisponiveis()}</strong>
                            </p>
                        </div>
                    );
                })}

                <p style={{ fontSize: '12px', color: '#ccc', margin: '2px 0 10px 0' }}>
                    📦 Peças restantes no baralho: <strong>{facade.obterQuantidadeBaralho()}</strong>
                </p>

                {/* Controles e Peça Atual */}
                <h2 style={{ fontSize: '18px', margin: '4px 0 8px 0' }}>Ações do Turno (Facade)</h2>

                {!jogoFinalizado && !partidaSomenteIA && faseAtual === 'COMPRAR_TILE' && (
                    <button
                        className="btn"
                        style={{ backgroundColor: '#2a9d8f', borderColor: '#fff' }}
                        onClick={() => facade.comprarTile()}
                    >
                        🎴 Comprar Peça do Baralho
                    </button>
                )}

                {!jogoFinalizado && tileEmMaos && faseAtual === 'POSICIONAR_TILE' && (
                    <div
                        style={{
                            textAlign: 'center',
                            backgroundColor: '#1e1e24',
                            padding: '10px',
                            borderRadius: '8px',
                            marginBottom: '10px'
                        }}
                    >
                        <p style={{ margin: '0 0 6px 0', fontSize: '13px', fontWeight: 'bold' }}>
                            Peça em Mãos ({tileEmMaos.obterRotacao()}°):
                        </p>
                        <img
                            src={tileEmMaos.imagem}
                            alt={tileEmMaos.tipo}
                            title="Clique para girar 90°"
                            onClick={() => facade.rotacionarTile()}
                            style={{
                                width: '75px',
                                height: '75px',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                transform: `rotate(${tileEmMaos.obterRotacao()}deg)`,
                                transition: 'transform 0.2s'
                            }}
                        />
                        <div style={{ fontSize: '11px', color: '#aaa', margin: '6px 0 10px 0' }}>
                            ⬆️ N: <strong>{tileEmMaos.obterBordaNorte()}</strong> | ➡️ L: <strong>{tileEmMaos.obterBordaLeste()}</strong>
                            <br />
                            ⬇️ S: <strong>{tileEmMaos.obterBordaSul()}</strong> | ⬅️ O: <strong>{tileEmMaos.obterBordaOeste()}</strong>
                        </div>
                        <button
                            className="btn"
                            style={{ width: '100%', backgroundColor: '#e76f51' }}
                            onClick={() => facade.rotacionarTile()}
                        >
                            🔄 Girar Peça 90°
                        </button>
                    </div>
                )}

                {!jogoFinalizado && (faseAtual === 'POSICIONAR_MEEPLE' || faseAtual === 'ALOCAR_MEEPLE') && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <p style={{ fontSize: '12px', margin: '0', color: '#ffd166' }}>
                            Escolha onde posicionar seu Meeple na peça destacada:
                        </p>
                        {opcoesMeepleDisponiveis.map((pos) => (
                            <button
                                key={pos.id}
                                className="btn"
                                style={{ padding: '8px', fontSize: '12px', textAlign: 'left' }}
                                onClick={() => facade.alocarMeeple(pos.id)}
                            >
                                {pos.label}
                            </button>
                        ))}
                        <button
                            className="btn"
                            style={{ backgroundColor: '#4a4e69', marginTop: '4px', padding: '8px' }}
                            onClick={() => facade.passarTurno()}
                        >
                            ⏭️ Não colocar Meeple (Passar Turno)
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default App;
