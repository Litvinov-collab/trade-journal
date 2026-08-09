const K = "tradeJournalV1";
const S = "tradeJournalSettings";

let trades = JSON.parse(localStorage.getItem(K) || "[]");
let settings = JSON.parse(
  localStorage.getItem(S) || '{"deposit":100,"risk":1}'
);

const $ = id => document.getElementById(id);

$("date").value = new Date().toISOString().slice(0, 10);
$("initialDeposit").value = settings.deposit;
$("riskPercent").value = settings.risk;

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, m => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[m]));
}

function bal() {
  let balance = Number(settings.deposit || 0);

  for (const trade of trades) {
    balance *= 1 + Number(trade.pl || 0) / 100;
  }

  return balance;
}

function render() {
  const n = trades.length;
  const w = trades.filter(t => t.result === "win").length;
  const d = trades.filter(t => t.discipline === "yes").length;

  const p = trades.reduce(
    (a, t) => a + Number(t.pl || 0),
    0
  );

  const av = n ? p / n : 0;
const tpCount = trades.filter(t => t.result === "win").length;
const slCount = trades.filter(t => t.result === "loss").length;

const bestTrade = trades.length
  ? Math.max(...trades.map(t => Number(t.pl || 0)))
  : 0;

let peak = Number(settings.deposit || 0);
let current = peak;
let maxDrawdown = 0;

for (const trade of trades) {
  current *= 1 + Number(trade.pl || 0) / 100;

  if (current > peak) {
    peak = current;
  }

  const drawdown =
    peak > 0 ? (peak - current) / peak * 100 : 0;

  if (drawdown > maxDrawdown) {
    maxDrawdown = drawdown;
  }
}

const pnlMoney =
  current - Number(settings.deposit || 0);
  $("count").textContent = n;

  $("winrate").textContent =
    n ? Math.round(w / n * 100) + "%" : "0%";

  $("discipline").textContent =
    n ? Math.round(d / n * 100) + "%" : "0%";

  $("balance").textContent =
    "$" + bal().toFixed(2);

  $("pnl").textContent =
    (p >= 0 ? "+" : "") + p.toFixed(2) + "%";

  $("avg").textContent =
    (av >= 0 ? "+" : "") + av.toFixed(2) + "%";
$("pnlMoney").textContent =
  (pnlMoney >= 0 ? "+" : "") +
  "$" +
  pnlMoney.toFixed(2);

$("tpCount").textContent = tpCount;

$("slCount").textContent = slCount;

$("bestTrade").textContent =
  (bestTrade >= 0 ? "+" : "") +
  bestTrade.toFixed(2) +
  "%";

$("drawdown").textContent =
  "-" +
  maxDrawdown.toFixed(2) +
  "%";
  $("empty").style.display =
    n ? "none" : "block";

  $("trades").innerHTML = trades
    .slice()
    .reverse()
    .map(t => `
      <tr>
        <td>${esc(t.date)}</td>
        <td>${esc(t.symbol)}</td>
        <td>${esc(t.session)}</td>
        <td>${esc(t.direction)}</td>
        <td class="${t.result}">
          ${t.result === "win"
            ? "TP"
            : t.result === "loss"
              ? "SL"
              : "BE"}
        </td>
        <td class="${Number(t.pl) >= 0 ? "win" : "loss"}">
          ${Number(t.pl) >= 0 ? "+" : ""}
          ${Number(t.pl).toFixed(2)}%
        </td>
        <td>
          ${t.discipline === "yes" ? "Да" : "Нет"}
        </td>
        <td>
          ${esc(t.comment || t.setup || "—")}
        </td>
      </tr>
    `)
    .join("");

  draw();
}

function draw() {
  const c = $("equity");
  const x = c.getContext("2d");

  const W = c.width;
  const H = c.height;

  x.clearRect(0, 0, W, H);

  let values = [Number(settings.deposit || 0)];
  let balance = values[0];

  trades.forEach(t => {
    balance *= 1 + Number(t.pl || 0) / 100;
    values.push(balance);
  });

  if (values.length < 2) {
    x.fillStyle = "#66717e";
    x.font = "16px Arial";
    x.fillText(
      "Добавь сделки, чтобы увидеть график",
      25,
      40
    );
    return;
  }

  let min = Math.min(...values);
  let max = Math.max(...values);

  if (min === max) {
    min--;
    max++;
  }

  x.beginPath();

  values.forEach((value, i) => {
    const xx =
      20 + i * (W - 40) / (values.length - 1);

    const yy =
      H - 20 -
      (value - min) / (max - min) * (H - 40);

    if (i === 0) {
      x.moveTo(xx, yy);
    } else {
      x.lineTo(xx, yy);
    }
  });

  x.strokeStyle = "#60a5fa";
  x.lineWidth = 3;
  x.stroke();
}

$("saveSettings").onclick = () => {
  settings = {
    deposit:
      Number($("initialDeposit").value) || 0,
    risk:
      Number($("riskPercent").value) || 0
  };

  localStorage.setItem(
    S,
    JSON.stringify(settings)
  );

  render();

  alert("Настройки сохранены");
};

$("tradeForm").onsubmit = e => {
  e.preventDefault();

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
    K,
    JSON.stringify(trades)
  );

  e.target.reset();

  $("date").value =
    new Date().toISOString().slice(0, 10);

  $("symbol").value = "BTCUSDT";

  render();
};

$("clearAll").onclick = () => {
  if (confirm("Удалить всю историю?")) {
    trades = [];

    localStorage.setItem(
      K,
      "[]"
    );

    render();
  }
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

  const link =
    document.createElement("a");

  link.href = URL.createObjectURL(
    new Blob(
      [csv],
      { type: "text/csv;charset=utf-8" }
    )
  );

  link.download = "trade-journal.csv";
  link.click();
};

render();
