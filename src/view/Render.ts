import { Tabuleiro } from "../models/Tabuleiro";

export function renderizarTabuleiro(
  tabuleiro: Tabuleiro,
  containerId: string,
): void {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = "";

  const gridElement = document.createElement("div");
  gridElement.className = "grid-tabuleiro";

  gridElement.style.gridTemplateColumns = `repeat(${tabuleiro.tamanho}, 80px)`;

  for (let l = 0; l < tabuleiro.tamanho; l++) {
    for (let c = 0; c < tabuleiro.tamanho; c++) {
      const celula = document.createElement("div");
      celula.className = "celula";

      const peca = tabuleiro.grid[l][c];

      if (peca) {
        celula.classList.add("com-peca");

        const img = document.createElement("img");
        img.src = peca.tile.imagem;
        img.alt = peca.tile.tipo;

        img.style.transform = `rotate(${peca.rotacao}deg)`;

        celula.appendChild(img);
      }

      gridElement.appendChild(celula);
    }
  }

  container.appendChild(gridElement);
}
