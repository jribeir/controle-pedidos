window.entradas = [];
window.saidas = [];

const ENDPOINT = "https://script.google.com/macros/s/AKfycbwsd8keb0E0v1NzEJn9LV_gcypYSBURTSqQdCS1y-4H_p9DKbMDPaL4Zy9-CjM3DNRuPg/exec";

async function carregarEntradas() {
  try {
    const res = await fetch(ENDPOINT);
    const dados = await res.json();

    window.entradas = dados;
    console.log("Entradas sincronizadas:", window.entradas);
  } catch (err) {
    console.error("Erro ao carregar entradas:", err);
  }
}

//CARREGA PEDIDOS AO ABRIR PAGINA
carregarEntradas();


document.getElementById("pedido").addEventListener("input", function () {
  this.value = this.value.toUpperCase().trim();
});
document.getElementById("uf").addEventListener("input", function () {
  this.value = this.value.toUpperCase().trim();
});
document.getElementById("lote").addEventListener("input", function () {
  this.value = this.value.toUpperCase().trim();
});

// Referência à tabela de saída
const tabelaSaida = document.getElementById("tabelaSaida");

// Formulários
const formEntrada = document.getElementById("formEntrada");
const formSaida = document.getElementById("formSaida");

// Toast
const toast = document.getElementById("toast");
const toastConfirm = document.getElementById("toastConfirm");
const toastCancel = document.getElementById("toastCancel");

//ATUALIZAR PAGINA
function atualizarSaida() {
  tabelaSaida.innerHTML = `
    <tr>
      <th>Número Pedido</th>
      <th>Volume Saída</th>
      <th>UF</th>
      <th>Lote</th>
      <th>Volume Entrada</th>
      <th>Volumetria Terciária</th>
      <th>Fabricação</th>
      <th>Validade</th>
      <th>Dias Aguardando</th>
      <th>OBS</th>
      <th>Status</th>
    </tr>
  `;

  window.saidas.forEach(p => {
    tabelaSaida.innerHTML += `
      <tr>
        <td>${p.pedido}</td>
        <td>${p.volume_saida}</td>
        <td>${p.uf}</td>
        <td>${p.lote}</td>
        <td>${p.volume}</td>
        <td>${p.volume_ter}</td>
        <td>${p.fabricacao}</td>
        <td>${p.validade}</td>
        <td>${p.dias}</td>
        <td>${p.obs}</td>
        <td>${p.status}</td>
      </tr>
    `;
  });
}

// NOTIFICA ERRO
function mostrarNotificacaoErro(msg) {
  const container = document.getElementById("notifications");
  const notification = document.createElement("div");
  notification.classList.add("notification", "show");
  notification.innerHTML = `<span class="icon">⚠️</span>${msg}
    <button class="close">&times;</button>`;

  container.appendChild(notification);

  notification.querySelector(".close").onclick = () => notification.remove();
  setTimeout(() => notification.remove(), 3000);
}

//TOAST
function mostrarToastVolumetria(confirmCallback) {
  toast.classList.add("show");

  toastConfirm.onclick = () => {
    toast.classList.remove("show");
    confirmCallback();
  };

  toastCancel.onclick = () => {
    toast.classList.remove("show");
  };
}

//ENTRADA DE PEDIDOS
formEntrada.addEventListener("submit", function (e) {
  e.preventDefault();

  const numeroPedido = document.getElementById("pedido").value.trim().toUpperCase();

  if (window.entradas.some(p => String(p.pedido).trim().toUpperCase() === numeroPedido)) {
    mostrarNotificacaoErro("Este pedido já existe!");
    return;
  }

  const novaEntrada = {
    tipo: "entrada",
    pedido: numeroPedido,
    uf: document.getElementById("uf").value,
    lote: document.getElementById("lote").value,
    volume: Number(document.getElementById("volume").value),
    volume_ter: document.getElementById("volume_ter").value,
    fabricacao: document.getElementById("fabricacao").value,
    validade: document.getElementById("validade").value,
    dias: new Date().toLocaleDateString("pt-BR", {
        month: "2-digit",
        year: "numeric"
        }),
    obs: document.getElementById("obs").value,
    tempCarro: document.getElementById("tempCarro").value,
    tempPedido: document.getElementById("tempPedido").value,
    status: "Aguardando Tratativa"
  };

  window.entradas.push(novaEntrada);
  formEntrada.reset();

  fetch(ENDPOINT, {
    method: "POST",
    body: JSON.stringify(novaEntrada)
  });
});

//SAIDA DE PEDIDOS
formSaida.addEventListener("submit", async function (e) {
  e.preventDefault();

  const numeroPedido = document.getElementById("pedidoSaida").value.trim().toUpperCase();
  const volumeSaida = Number(document.getElementById("volumeSaida").value);

  await carregarEntradas();

  const reversedIndex = [...window.entradas]
    .reverse()
    .findIndex(p =>
      String(p.pedido).trim().toUpperCase() === numeroPedido &&
      p.tipo === "entrada" &&
      p.status !== "OK"
    );

  if (reversedIndex === -1) {
    mostrarNotificacaoErro("Pedido não encontrado ou já finalizado!");
    return;
  }

  const realIdx = window.entradas.length - 1 - reversedIndex;
  const pedidoEntrada = window.entradas[realIdx];

  function processarSaida() {
    window.entradas.splice(realIdx, 1);

    const restante = pedidoEntrada.volume - volumeSaida;

    const registroSaida = {
      ...pedidoEntrada,
      tipo: "saida",
      volume_saida: volumeSaida,
      status: restante > 0 ? "Saída Parcial" : "OK"
    };

    window.saidas.push(registroSaida);
    atualizarSaida();

    fetch(ENDPOINT, {
      method: "POST",
      body: JSON.stringify(registroSaida)
    });

    if (restante > 0) {
      const novaEntrada = {
        ...pedidoEntrada,
        tipo: "entrada",
        volume: restante,
        status: "Parcial Restante"
      };

      window.entradas.push(novaEntrada);

      fetch(ENDPOINT, {
        method: "POST",
        body: JSON.stringify(novaEntrada)
      });
    }

    formSaida.reset();
  }

  if (volumeSaida !== pedidoEntrada.volume) {
    mostrarToastVolumetria(processarSaida);
  } else {
    processarSaida();
  }
});

//ALTERNAR ABAS
const links = document.querySelectorAll(".nav-links a");
links.forEach(link => {
  link.addEventListener("click", function (e) {
    e.preventDefault();

    links.forEach(l => l.classList.remove("active"));
    this.classList.add("active");

    document.querySelectorAll(".aba").forEach(sec => {
      sec.style.display = "none";
    });

    const targetId = this.getAttribute("href").substring(1);
    const section = document.getElementById(targetId + "Section");
    if (section) section.style.display = "block";
  });
});