import { useEffect, useMemo, useRef, useState } from 'react';
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
    type TipoEstrategiaIA = 'FACIL' | 'AGRESSIVA' | 'DEFENSIVA';
    const [tiposEstrategiaIA, setTiposEstrategiaIA] = useState<TipoEstrategiaIA[]>(['FACIL', 'AGRESSIVA', 'DEFENSIVA', 'FACIL', 'AGRESSIVA']);
    const [quantidadeJogadores, setQuantidadeJogadores] = useState(2);
    const [quantidadeIAs, setQuantidadeIAs] = useState(0);
    const [atrasoIA, setAtrasoIA] = useState(700);
    const ultimaConfiguracao = useRef<{ nome: string; tipo: 'JOGADOR' | 'IA'; estrategia?: EstrategiaIA }[]>([
        { nome: 'Jogador 1 (Você)', tipo: 'JOGADOR' }, { nome: 'Jogador 2', tipo: 'JOGADOR' }
    ]);

    useEffect(() => {
        const observadorDaTela: IGameObserver = {
            aoAtualizarJogo: () => {
                setTick((t) => t + 1);
            }
        };

        facade.adicionarObservador(observadorDaTela);
        ultimaConfiguracao.current = [{ nome: 'Jogador 1 (Você)', tipo: 'JOGADOR' }, { nome: 'Jogador 2', tipo: 'JOGADOR' }];
        facade.iniciarNovaPartida(['Jogador 1 (Você)', 'Jogador 2']);

        return () => {
            facade.removerObservador(observadorDaTela);
        };
    }, [facade]);

    useEffect(() => {
        facade.definirAtrasoEntreAcoesIA(atrasoIA);
    }, [facade, atrasoIA]);

    const obterInstanciaEstrategiaIA = (tipo: TipoEstrategiaIA): EstrategiaIA => {
        switch (tipo) {
            case 'AGRESSIVA': return new EstrategiaIAAgressiva();
            case 'DEFENSIVA': return new EstrategiaIADefensiva();
            default: return new EstrategiaIAPrimeiraValida();
        }
    };

    const iniciarPartidaConfigurada = () => {
        const participantes = [
            ...Array.from({ length: quantidadeJogadores }, (_, i) => ({ nome: `Jogador ${i + 1}`, tipo: 'JOGADOR' as const })),
            ...Array.from({ length: quantidadeIAs }, (_, i) => ({
                nome: `IA ${i + 1} (${tiposEstrategiaIA[i]})`,
                tipo: 'IA' as const,
                estrategia: obterInstanciaEstrategiaIA(tiposEstrategiaIA[i])
            }))
        ];
        ultimaConfiguracao.current = participantes;
        facade.iniciarPartidaConfigurada(participantes);
    };

    const reiniciarPartida = () => facade.iniciarPartidaConfigurada(ultimaConfiguracao.current);

    const tabuleiro = facade.obterTabuleiro();
    const grid = tabuleiro.obterGrid();
    const participantes = facade.obterParticipantes();
    const jogadorAtual = facade.obterJogadorAtual();
    const tileEmMaos = facade.obterTileAtual();
    const ultimoTile = facade.obterUltimoTilePosicionado();
    const faseAtual = facade.obterFaseAtual();
    const jogoFinalizado = facade.estaFinalizada();
    const partidaSomenteIA = facade.ehPartidaSomenteIA();
    const partidaPausada = facade.estaPausadaIA();
    const vencedores = jogoFinalizado ? facade.obterVencedores() : [];

    // Em IA contra IA, executa um turno por vez para mostrar cada jogada
    useEffect(() => {
        if (!partidaSomenteIA || jogoFinalizado) return;

        const temporizador = setInterval(() => facade.executarTurnoIA(), atrasoIA);
        return () => clearInterval(temporizador);
    }, [facade, partidaSomenteIA, jogoFinalizado, atrasoIA]);

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
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px' }}>
                        <button className="btn" onClick={() => { setQuantidadeJogadores(2); setQuantidadeIAs(0); }}>JxJ</button>
                        <button className="btn" onClick={() => { setQuantidadeJogadores(0); setQuantidadeIAs(2); }}>IAxIA</button>
                        <button className="btn" onClick={() => { setQuantidadeJogadores(2); setQuantidadeIAs(1); }}>JxJxIA</button>
                        <button className="btn" onClick={() => { setQuantidadeJogadores(1); setQuantidadeIAs(1); }}>JxIA</button>
                    </div>
                    <div style={{ backgroundColor: '#1e1e24', padding: '8px', borderRadius: '6px' }}>
                        <label style={{ fontSize: '11px', color: '#ffd166', fontWeight: 'bold' }}>Quantidade de jogadores humanos</label>
                        <select aria-label="Quantidade de jogadores humanos" style={{ width: '100%', padding: '6px', backgroundColor: '#2d3142', color: '#fff' }} value={quantidadeJogadores} onChange={(e) => { const n = Number(e.target.value); setQuantidadeJogadores(n); setQuantidadeIAs((atual) => Math.min(atual, 5 - n)); }}>
                            {Array.from({ length: 6 - quantidadeIAs }, (_, n) => n).map((n) => <option key={n} value={n}>{n} humanos</option>)}
                        </select>
                        <label style={{ fontSize: '11px', color: '#ffd166', fontWeight: 'bold' }}>Quantidade de IAs</label>
                        <select aria-label="Quantidade de IAs" style={{ width: '100%', padding: '6px', backgroundColor: '#2d3142', color: '#fff' }} value={quantidadeIAs} onChange={(e) => { const n = Number(e.target.value); setQuantidadeIAs(n); setQuantidadeJogadores((atual) => Math.min(atual, 5 - n)); }}>
                            {Array.from({ length: 6 - quantidadeJogadores }, (_, n) => n).map((n) => <option key={n} value={n}>{n} IAs</option>)}
                        </select>
                    </div>
                    {Array.from({ length: quantidadeIAs }, (_, i) => (
                        <label key={i} style={{ fontSize: '11px', color: '#ffd166' }}>
                            Estratégia da IA {i + 1}
                            <select aria-label={`Estratégia da IA ${i + 1}`} style={{ width: '100%', padding: '6px', backgroundColor: '#2d3142', color: '#fff' }} value={tiposEstrategiaIA[i]} onChange={(e) => setTiposEstrategiaIA((atual) => atual.map((t, j) => j === i ? e.target.value as TipoEstrategiaIA : t))}>
                                <option value="FACIL">Fácil</option><option value="AGRESSIVA">Agressiva</option><option value="DEFENSIVA">Defensiva</option>
                            </select>
                        </label>
                    ))}
                    <button className="btn" onClick={iniciarPartidaConfigurada} disabled={quantidadeJogadores + quantidadeIAs < 2}>
                        Iniciar partida ({quantidadeJogadores + quantidadeIAs} participantes)
                    </button>
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

                <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                    {partidaSomenteIA && !jogoFinalizado && (
                        <button className="btn" style={{ flex: 1, backgroundColor: '#e9c46a', color: '#222' }} onClick={() => facade.alternarPausaIA()}>
                            {partidaPausada ? '▶️ Continuar' : '⏸️ Pausar'}
                        </button>
                    )}
                    <button className="btn" style={{ flex: 1, backgroundColor: '#e76f51' }} onClick={reiniciarPartida}>
                        🔄 Reiniciar partida
                    </button>
                </div>
                {participantes.some((p) => p.ehAutomatico()) && (
                    <label style={{ display: 'block', fontSize: '12px', color: '#ffd166', marginBottom: '10px' }}>
                        Espera entre ações da IA (ms)
                        <input
                            type="number"
                            min={0}
                            max={10000}
                            step={100}
                            value={atrasoIA}
                            onChange={(e) => setAtrasoIA(Math.max(0, Math.min(10000, Number(e.target.value) || 0)))}
                            style={{ width: '100%', marginTop: '4px', padding: '6px', backgroundColor: '#2d3142', color: '#fff', border: '1px solid #4f5d75', borderRadius: '4px' }}
                        />
                    </label>
                )}

                <p style={{ fontSize: '12px', color: '#ccc', margin: '2px 0 10px 0' }}>
                    📦 Peças restantes no baralho: <strong>{facade.obterQuantidadeBaralho()}</strong>
                </p>

                {/* Controles e Peça Atual */}


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
