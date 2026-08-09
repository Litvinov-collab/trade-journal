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

function getBalance() {
  let balance = Number(settings.deposit || 0);

  for (const trade of trades) {
    balance *= 1 + Number(trade.pl || 0) / 100;
  }

  return balance;
}

function render() {
  const count = trades.length;

  const wins = trades.filter(
    t => t.result === "win"
  ).length;

  const disciplined = trades.filter(
    t => t.discipline === "yes"
  ).length;

  const tpCount = wins;

  const slCount = trades.filter(
    t => t.result === "loss"
  ).length;

  const totalPL = trades.reduce(
    (sum, t) => sum + Number(t.pl || 0),
    0
  );

  const average = count
    ? totalPL / count
    : 0;

  const bestTrade = count
    ? Math.max(
        ...trades.map(t => Number(t.pl || 0))
      )
    : 0;

  let balance =
    Number(settings.deposit || 0);

  let peak = balance;
  let maxDrawdown = 0;

  for (const trade of trades) {
    balance *=
      1 + Number(trade.pl || 0) / 100;

    if (balance > peak) {
      peak = balance;
    }

    if (peak > 0) {
      const drawdown =
        (peak - balance) / peak * 100;

      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }
  }

  const pnlMoney =
    balance - Number(settings.deposit || 0);

  $("count").textContent = count;

  $("winrate").textContent =
    count
      ? Math.round(wins / count * 100) + "%"
      : "0%";

  $("discipline").textContent =
    count
      ? Math.round(
          disciplined / count * 100
        ) + "%"
      : "0%";

  $("pnl").textContent =
    (totalPL >= 0 ? "+" : "") +
    totalPL.toFixed(2) +
    "%";

  $("pnlMoney").textContent =
    (pnlMoney >= 0 ? "+" : "-") +
    "$" +
    Math.abs(pnlMoney).toFixed(2);

  $("tpCount").textContent =
    tpCount;

  $("slCount").textContent =
    slCount;

  $("bestTrade").textContent =
    (bestTrade >= 0 ? "+" : "") +
    bestTrade.toFixed(2) +
    "%";

  $("drawdown").textContent =
    "-" +
    maxDrawdown.toFixed(2) +
    "%";

  $("empty").style.display =
    count ? "none" : "block";

  $("trades").innerHTML =
    trades
      .slice()
      .reverse()
      .map(t => `
        <tr>
          <td>${esc(t.date)}</td>
          <td>${esc(t.symbol)}</td>
          <td>${esc(t.session)}</td>
          <td>${esc(t.direction)}</td>

          <td class="${t.result}">
            ${
              t.result === "win"
                ? "TP"
                : t.result === "loss"
                  ? "SL"
                  : "BE"
            }
          </td>

          <td class="${
            Number(t.pl) >= 0
              ? "win"
              : "loss"
          }">
            ${
              Number(t.pl) >= 0
                ? "+"
                : ""
            }${Number(t.pl).toFixed(2)}%
          </td>

          <td>
            ${
              t.discipline === "yes"
                ? "Да"
                : "Нет"
            }
          </td>

          <td>
            ${esc(
              t.comment ||
              t.setup ||
              "—"
            )}
          </td>
        </tr>
      `)
      .join("");

  draw();
}

function draw() {
  const canvas = $("equity");

  if (!canvas) return;

  const ctx =
    canvas.getContext("2d");

  const W = canvas.width;
  const H = canvas.height;

  ctx.clearRect(0, 0, W, H);

  let values = [
    Number(settings.deposit || 0)
  ];

  let balance = values[0];

  for (const trade of trades) {
    balance *=
      1 + Number(trade.pl || 0) / 100;

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

  let min =
    Math.min(...values);

  let max =
    Math.max(...values);

  if (min === max) {
    min -= 1;
    max += 1;
  }

  ctx.beginPath();

  values.forEach(
    (value, index) => {
      const x =
        20 +
        index *
          (W - 40) /
          (values.length - 1);

      const y =
        H -
        20 -
        (value - min) /
          (max - min) *
          (H - 40);

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
  );

  ctx.strokeStyle = "#60a5fa";
  ctx.lineWidth = 3;
  ctx.stroke();
}

$("saveSettings").onclick = () => {
  settings = {
    deposit:
      Number(
        $("initialDeposit").value
      ) || 0,

    risk:
      Number(
        $("riskPercent").value
      ) || 0
  };

  localStorage.setItem(
    S,
    JSON.stringify(settings)
  );

  render();

  alert(
    "Настройки сохранены"
  );
};

$("tradeForm").onsubmit = event => {
  event.preventDefault();

  trades.push({
    date: $("date").value,

    symbol:
      $("symbol").value.trim(),

    session:
      $("session").value,

    direction:
      $("direction").value,

    result:
      $("result").value,

    pl:
      Number($("pl").value),

    setup:
      $("setup").value,

    discipline:
      $("disciplineInput").value,

    comment:
      $("comment").value
  });

  localStorage.setItem(
    K,
    JSON.stringify(trades)
  );

  event.target.reset();

  $("date").value =
    new Date()
      .toISOString()
      .slice(0, 10);

  $("symbol").value =
    "BTCUSDT";

  render();
};

$("clearAll").onclick = () => {
  if (
    !confirm(
      "Удалить всю историю?"
    )
  ) {
    return;
  }

  trades = [];

  localStorage.setItem(
    K,
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
            `"${String(
              value ?? ""
            ).replace(
              /"/g,
              '""'
            )}"`
          )
          .join(",")
      )
      .join("\n");

  const link =
    document.createElement("a");

  link.href =
    URL.createObjectURL(
      new Blob(
        [csv],
        {
          type:
            "text/csv;charset=utf-8"
        }
      )
    );

  link.download =
    "trade-journal.csv";

  link.click();
};

render();
