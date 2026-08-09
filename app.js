const TRADES_KEY = "tradeJournalV1";
const SETTINGS_KEY = "tradeJournalSettings";

const $ = (id) => document.getElementById(id);

let trades = JSON.parse(localStorage.getItem(TRADES_KEY) || "[]");
let settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");

if (typeof settings !== "object" || settings === null) settings = {};

const savedDeposit = Number(settings.deposit);
const savedRisk = Number(settings.risk);

$("initialDeposit").value =
  Number.isFinite(savedDeposit) && savedDeposit > 0 ? savedDeposit : 50;

$("riskPercent").value =
  Number.isFinite(savedRisk) && savedRisk >= 0 ? savedRisk : 2;

$("date").value = new Date().toISOString().slice(0, 10);

function getDeposit() {
  const value = Number($("initialDeposit").value);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function getTotalPL() {
  return trades.reduce((sum, trade) => sum + Number(trade.pl || 0), 0);
}

function getBalance() {
  let balance = getDeposit();

  for (const trade of trades) {
    const pl = Number(trade.pl || 0);
    balance *= 1 + pl / 100;
  }

  return balance;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}

function render() {
  const count = trades.length;
  const wins = trades.filter(t => t.result === "win").length;
  const disciplined = trades.filter(t => t.discipline === "yes").length;

  const totalPL = getTotalPL();
  const average = count ? totalPL / count : 0;
  const balance = getBalance();

  $("count").textContent = count;

  $("winrate").textContent =
    count ? Math.round(wins / count * 100) + "%" : "0%";

  $("discipline").textContent =
    count ? Math.round(disciplined / count * 100) + "%" : "0%";

  $("balance").textContent = "$" + balance.toFixed(2);

  $("pnl").textContent =
    (totalPL >= 0 ? "+" : "") + totalPL.toFixed(2) + "%";

  $("avg").textContent =
    (average >= 0 ? "+" : "") + average.toFixed(2) + "%";

  $("empty").style.display = count ? "none" : "block";

  $("trades").innerHTML = trades.slice().reverse().map(t => `
    <tr>
      <td>${escapeHtml(t.date)}</td>
      <td>${escapeHtml(t.symbol)}</td>
      <td>${escapeHtml(t.session)}</td>
      <td>${escapeHtml(t.direction)}</td>
      <td class="${t.result}">
        ${t.result === "win" ? "TP" : t.result === "loss" ? "SL" : "BE"}
      </td>
      <td class="${Number(t.pl) >= 0 ? "win" : "loss"}">
        ${Number(t.pl) >= 0 ? "+" : ""}${Number(t.pl).toFixed(2)}%
      </td>
      <td>${t.discipline === "yes" ? "Да" : "Нет"}</td>
      <td>${escapeHtml(t.comment || t.setup || "—")}</td>
    </tr>
  `).join("");

  drawEquity();
}

function drawEquity() {
  const canvas = $("equity");
  const ctx = canvas.getContext("2d");

  const W = canvas.width;
  const H = canvas.height;

  ctx.clearRect(0, 0, W, H);

  let values = [getDeposit()];
  let balance = getDeposit();

  for (const trade of trades) {
    balance *= 1 + Number(trade.pl || 0) / 100;
    values.push(balance);
  }

  if (values.length < 2) {
    ctx.fillStyle = "#66717e";
    ctx.font = "16px Arial";
    ctx.fillText(
      "Добавь сделки, чтобы увидеть график",
      25,
      40
    );
    return;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max === min ? 1 : max - min;

  ctx.beginPath();

  values.forEach((value, index) => {
    const x =
      25 + index * (W - 50) / (values.length - 1);

    const y =
      H - 25 -
      (value - min) / range *
      (H - 50);

    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });

  ctx.strokeStyle = "#60a5fa";
  ctx.lineWidth = 3;
  ctx.stroke();
}

$("saveSettings").onclick = () => {
  settings = {
    deposit: getDeposit(),
    risk: Number($("riskPercent").value) || 0
  };

  localStorage.setItem(
    SETTINGS_KEY,
    JSON.stringify(settings)
  );

  render();
};

$("tradeForm").onsubmit = (event) => {
  event.preventDefault();

  trades.push({
    date: $("date").value,
    symbol: $("symbol").value.trim(),
    session: $("session").value,
    direction: $("direction").value,
    result: $("result").value,
    pl: Number($("pl").value),
    setup: $("setup").value,
    discipline: $("disciplineInput").value,
    comment: $("comment").value
  });

  localStorage.setItem(
    TRADES_KEY,
    JSON.stringify(trades)
  );

  event.target.reset();

  $("date").value =
    new Date().toISOString().slice(0, 10);

  $("symbol").value = "BTCUSDT";

  render();
};

$("clearAll").onclick = () => {
  if (!confirm("Удалить всю историю сделок?")) {
    return;
  }

  trades = [];

  localStorage.setItem(
    TRADES_KEY,
    "[]"
  );

  render();
};

$("export").onclick = () => {
  const rows = [
    [
      "Дата",
      "Инструмент",
      "Сессия",
      "Направление",
      "Результат",
      "P/L %",
      "Стратегия",
      "Комментарий"
    ],

    ...trades.map(t => [
      t.date,
      t.symbol,
      t.session,
      t.direction,
      t.result,
      t.pl,
      t.discipline,
      t.comment || t.setup
    ])
  ];

  const csv =
    "\ufeff" +
    rows
      .map(row =>
        row
          .map(value =>
            `"${String(value ?? "").replace(/"/g, '""')}"`
          )
          .join(",")
      )
      .join("\n");

  const link = document.createElement("a");

  link.href = URL.createObjectURL(
    new Blob(
      [csv],
      {
        type: "text/csv;charset=utf-8"
      }
    )
  );

  link.download = "trade-journal.csv";

  link.click();
};

render();
