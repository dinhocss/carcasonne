import { useEffect, useState } from 'react';
import './style.css';
import { GameManager, type IGameObserver } from './models/GameManager';
import { PosicaoSubsegmento, type TipoTerreno } from './models/Enums';

// Converte o terreno no nome da profissão do Meeple para ajudar o jogador na tela
function nomeProfissao(terreno: TipoTerreno): string {
    switch (terreno) {
        case 'CIDADE': return 'Cavaleiro';
        case 'ESTRADA': return 'Ladrão';
        case 'CAMPO': return 'Fazendeiro';
        case 'MOSTEIRO': return 'Monge';
    }
}

// Calcula onde desenhar a bolinha do Meeple dentro do quadrado 70x70 da peça!
function obterEstiloPosicaoMeeple(idSubsegmento: number): React.CSSProperties {
    // Norte (0, 1, 2) -> Topo
    if (idSubsegmento <= 2) return { top: '4px', left: '50%', transform: 'translateX(-50%)' };
    // Leste (3, 4, 5) -> Direita
    if (idSubsegmento <= 5) return { right: '4px', top: '50%', transform: 'translateY(-50%)' };
    // Sul (6, 7, 8) -> Baixo
    if (idSubsegmento <= 8) return { bottom: '4px', left: '50%', transform: 'translateX(-50%)' };
    // Oeste (9, 10, 11) -> Esquerda
    if (idSubsegmento <= 11) return { left: '4px', top: '50%', transform: 'translateY(-50%)' };
    // Centro (12) -> Meio exato
    return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
}

export function App() {
    const gameManager = GameManager.getInstance();
    const [, setTick] = useState(0);
    const [menuFechado, setMenuFechado] = useState(false);

    useEffect(() => {
        const observadorDaTela: IGameObserver = {
            aoAtualizarJogo: () => {
                setTick((t) => t + 1);
            }
        };

        gameManager.adicionarObservador(observadorDaTela);
        gameManager.iniciarPartida(false);

        return () => {
            gameManager.removerObservador(observadorDaTela);
        };
    }, [gameManager]);

    const tabuleiro = gameManager.obterTabuleiro();
    const grid = tabuleiro.obterGrid();
    const participantes = gameManager.obterParticipantes();
    const jogadorAtual = gameManager.obterJogadorAtual();
    const tileEmMaos = gameManager.obterTileEmMaos();
    const ultimoTile = gameManager.obterUltimoTilePosicionado();
    const faseAtual = gameManager.obterFaseAtual();

    // Gera as opções reais de Meeple baseadas nos terrenos da peça que acabou de ser colocada
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
              // SÓ adiciona o botão do Centro se a peça realmente tiver um MOSTEIRO!
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
                <h1 style={{ marginBottom: '4px', fontSize: '24px' }}>
                    🏰 Carcassonne (GRASP & GoF)
                </h1>
                <p style={{ marginBottom: '12px', color: '#ffd166', fontWeight: 'bold', fontSize: '14px' }}>
                    {gameManager.obterMensagemStatus()}
                </p>

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
                                            gameManager.posicionarTileNoTabuleiro(x, y);
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

            {/* Lado Direito: Menu Lateral Compacto e com Scroll */}
            <div className={`sidebar ${menuFechado ? 'fechada' : ''}`} id="menu-lateral">
                <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', paddingRight: '45px' }}>
                    <button
                        className="btn"
                        style={{ flex: 1, padding: '8px', fontSize: '12px' }}
                        onClick={() => gameManager.iniciarPartida(false)}
                    >
                        👥 2 Jogadores
                    </button>
                    <button
                        className="btn"
                        style={{ flex: 1, padding: '8px', fontSize: '12px' }}
                        onClick={() => gameManager.iniciarPartida(true)}
                    >
                        🤖 Contra IA
                    </button>
                </div>

                <h2 style={{ fontSize: '18px', margin: '4px 0 8px 0' }}>Jogadores</h2>
                {participantes.map((p, index) => {
                    const ehVezDele = p === jogadorAtual;
                    return (
                        <div
                            key={index}
                            className="card-jogador"
                            style={{
                                padding: '10px 12px',
                                marginBottom: '8px',
                                borderLeft: `5px solid ${p.obterCor()}`,
                                outline: ehVezDele ? '2px solid #ffffff' : 'none'
                            }}
                        >
                            <h3 style={{ margin: '0 0 4px 0', fontSize: '15px' }}>
                                {p.obterNome()} {ehVezDele && '⬅️'}
                            </h3>
                            <p style={{ margin: 0, fontSize: '13px' }}>
                                🏆 Pontos: <strong>{p.obterPontuacao()}</strong> | 🧍 Meeples:{' '}
                                <strong>{p.obterQuantidadeMeeplesDisponiveis()}</strong>
                            </p>
                        </div>
                    );
                })}

                <p style={{ fontSize: '12px', color: '#ccc', margin: '2px 0 10px 0' }}>
                    📦 Peças restantes no baralho: <strong>{gameManager.obterQuantidadeBaralho()}</strong>
                </p>

                {/* Controles e Peça Atual logo acima para nunca cortar na tela! */}
                <h2 style={{ fontSize: '18px', margin: '4px 0 8px 0' }}>Ações do Turno</h2>

                {faseAtual === 'COMPRAR_TILE' && (
                    <button
                        className="btn"
                        style={{ backgroundColor: '#2a9d8f', borderColor: '#fff' }}
                        onClick={() => gameManager.comprarTileDoTurno()}
                    >
                        🎴 Comprar Peça do Baralho
                    </button>
                )}

                {tileEmMaos && faseAtual === 'POSICIONAR_TILE' && (
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
                            onClick={() => gameManager.rotacionarTileAtual()}
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
                            onClick={() => gameManager.rotacionarTileAtual()}
                        >
                            🔄 Girar Peça 90°
                        </button>
                    </div>
                )}

                {(faseAtual === 'POSICIONAR_MEEPLE' || faseAtual === 'ALOCAR_MEEPLE') && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <p style={{ fontSize: '12px', margin: '0', color: '#ffd166' }}>
                            Escolha onde posicionar seu Meeple na peça destacada:
                        </p>
                        {opcoesMeepleDisponiveis.map((pos) => (
                            <button
                                key={pos.id}
                                className="btn"
                                style={{ padding: '8px', fontSize: '12px', textAlign: 'left' }}
                                onClick={() => gameManager.alocarMeepleNoTileAtual(pos.id)}
                            >
                                {pos.label}
                            </button>
                        ))}
                        <button
                            className="btn"
                            style={{ backgroundColor: '#4a4e69', marginTop: '4px', padding: '8px' }}
                            onClick={() => gameManager.finalizarTurnoSemMeeple()}
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
