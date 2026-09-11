
import './style.css';
import { Tabuleiro } from './models/Tabuleiro';
import { catalogo_pecas } from './data/TilesData'; 

const app = document.getElementById('app');

if (app) {

  const tabuleiro = new Tabuleiro(9);


  const pecaTeste1 = {
    id: 'peca_1',
    tile: catalogo_pecas[0].modelo, // Primeira peça do seu catálogo
    x: 0, y: 0, rotacao: 0
  };
  
  const pecaTeste2 = {
    id: 'peca_2',
    tile: catalogo_pecas[23].modelo, // O Mosteiro isolado do seu catálogo
    x: 0, y: 0, rotacao: 90
  };

  tabuleiro.posicionarPeca(4, 4, pecaTeste1);
  tabuleiro.posicionarPeca(4, 5, pecaTeste2);

  let htmlDoGrid = `<div class="grid-tabuleiro" style="grid-template-columns: repeat(${tabuleiro.tamanho}, 80px);">`;

  for (let linha = 0; linha < tabuleiro.tamanho; linha++) {
    for (let coluna = 0; coluna < tabuleiro.tamanho; coluna++) {
      const espaco = tabuleiro.grid[linha][coluna];
      
      if (espaco) {

        htmlDoGrid += `
          <div class="celula" style="border: none;">
            <img src="${espaco.tile.imagem}" style="transform: rotate(${espaco.rotacao}deg);" />
          </div>
        `;
      } else {
        htmlDoGrid += `<div class="celula"></div>`;
      }
    }
  }

  htmlDoGrid += `</div>`;

  app.innerHTML = `
    <div class="app-container">
        
        <!-- Botão Hamburger -->
        <button id="btn-toggle-menu" class="btn-menu">☰</button>

        <!-- Lado Esquerdo: O Tabuleiro -->
        <div class="area-jogo">
            <h1 style="margin-bottom: 5px;">♟️ Meu Jogo Carcassonne</h1>
            <p style="margin-bottom: 30px; color: #aaa;">Matriz ${tabuleiro.tamanho}x${tabuleiro.tamanho}</p>
            ${htmlDoGrid}
        </div>

        <!-- Lado Direito: Menu Lateral -->
        <div class="sidebar" id="menu-lateral">
            <h2>Jogadores</h2>
            
            <div class="card-jogador" style="border-left: 4px solid #4CAF50;">
                <h3 style="margin: 0 0 10px 0;">Jogador 1 (Você)</h3>
                <p style="margin: 0;">Pontos: 0 | Meeples: 7</p>
            </div>

            <div class="card-jogador" style="border-left: 4px solid #2196F3;">
                <h3 style="margin: 0 0 10px 0;">Jogador 2</h3>
                <p style="margin: 0;">Pontos: 0 | Meeples: 7</p>
            </div>

            <h2 style="margin-top: auto;">Controles</h2>
            <div style="display: flex; flex-direction: column; gap: 10px;">
                <button class="btn">Comprar Peça</button>
                <button class="btn">Girar 90°</button>
                <button class="btn">Confirmar Jogada</button>
            </div>
        </div>

    </div>
  `;


  const btnMenu = document.getElementById('btn-toggle-menu');
  const menuLateral = document.getElementById('menu-lateral');

  if (btnMenu && menuLateral) {
    btnMenu.addEventListener('click', () => {
        menuLateral.classList.toggle('fechada');
    });
  }
}