/* =========================================================
   TRADE JOURNAL — SUPABASE VERSION
   ========================================================= */

const SUPABASE_URL =
  "https://mocxiqabmoehjkpsddld.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_LdhC8_unv5Yiq5cevuPxqw_MWxnMiau";

const TRADES_KEY = "tradeJournalV1";
const SETTINGS_KEY = "tradeJournalSettings";

let db = null;
let currentUser = null;
let trades = [];
let settings = {
  deposit: 100,
  risk: 1
};

const $ = id => document.getElementById(id);


/* =========================================================
   ЗАГРУЗКА SUPABASE
   ========================================================= */

function loadSupabase() {
  return new Promise((resolve, reject) => {

    if (window.supabase) {
      resolve();
      return;
    }

    const script = document.createElement("script");

    script.src =
      "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";

    script.onload = resolve;

    script.onerror = () =>
      reject(
        new Error("Не удалось загрузить Supabase")
      );

    document.head.appendChild(script);
  });
}


/* =========================================================
   ИНИЦИАЛИЗАЦИЯ
   ========================================================= */

async function initSupabase() {

  try {

    await loadSupabase();

    db = window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_KEY
    );

    const {
      data: {
        session
      }
    } = await db.auth.getSession();

    if (session) {

      currentUser = session.user;

      await loadCloudTrades();

      showUserPanel();

    } else {

      showLogin();

    }

  } catch (error) {

    console.error(error);

    alert(
      "Ошибка подключения к Supabase: " +
      error.message
    );
  }
}


/* =========================================================
   АВТОРИЗАЦИЯ
   ========================================================= */

function createAuthUI() {

  if (document.getElementById("supabaseAuthBox"))
    return;

  const box = document.createElement("div");

  box.id = "supabaseAuthBox";

  box.innerHTML = `

    <div style="
      position:fixed;
      inset:0;
      background:rgba(0,0,0,.75);
      backdrop-filter:blur(8px);
      z-index:9999;
      display:flex;
      align-items:center;
      justify-content:center;
      padding:20px;
    ">

      <div style="
        width:100%;
        max-width:400px;
        background:#121a24;
        border:1px solid #253244;
        border-radius:18px;
        padding:25px;
        box-shadow:0 20px 60px rgba(0,0,0,.5);
      ">

        <h2 style="
          margin-top:0;
          text-align:center;
        ">
          📊 Trade Journal
        </h2>

        <p style="
          color:#7f8c9b;
          text-align:center;
        ">
          Войди в аккаунт, чтобы сохранять сделки
        </p>

        <input
          id="authEmail"
          type="email"
          placeholder="Email"
          style="margin-bottom:10px"
        >

        <input
          id="authPassword"
          type="password"
          placeholder="Пароль"
          style="margin-bottom:12px"
        >

        <button
          id="loginBtn"
          class="primary"
          style="width:100%;margin-top:0"
        >
          Войти
        </button>

        <button
          id="registerBtn"
          class="secondary"
          style="width:100%;margin-top:10px"
        >
          Создать аккаунт
        </button>

        <p
          id="authMessage"
          style="
            color:#7f8c9b;
            text-align:center;
            font-size:13px;
            margin-bottom:0;
          "
        ></p>

      </div>

    </div>
  `;

  document.body.appendChild(box);

  $("loginBtn").onclick =
    loginUser;

  $("registerBtn").onclick =
    registerUser;
}


function showLogin() {

  createAuthUI();

  const box =
    document.getElementById(
      "supabaseAuthBox"
    );

  if (box)
    box.style.display = "block";
}


function hideLogin() {

  const box =
    document.getElementById(
      "supabaseAuthBox"
    );

  if (box)
    box.style.display = "none";
}


async function registerUser() {

  const email =
    $("authEmail").value.trim();

  const password =
    $("authPassword").value;

  if (!email || !password) {

    $("authMessage").textContent =
      "Введи email и пароль.";

    return;
  }

  if (password.length < 6) {

    $("authMessage").textContent =
      "Пароль должен быть минимум 6 символов.";

    return;
  }

  $("authMessage").textContent =
    "Создаём аккаунт...";

  const {
    data,
    error
  } = await db.auth.signUp({
    email,
    password
  });

  if (error) {

    $("authMessage").textContent =
      error.message;

    return;
  }

  if (data.session) {

    currentUser =
      data.session.user;

    await loadCloudTrades();

    hideLogin();

    showUserPanel();

  } else {

    $("authMessage").textContent =
      "Аккаунт создан. Проверь email для подтверждения.";
  }
}


async function loginUser() {

  const email =
    $("authEmail").value.trim();

  const password =
    $("authPassword").value;

  if (!email || !password) {

    $("authMessage").textContent =
      "Введи email и пароль.";

    return;
  }

  $("authMessage").textContent =
    "Выполняется вход...";

  const {
    data,
    error
  } = await db.auth.signInWithPassword({
    email,
    password
  });

  if (error) {

    $("authMessage").textContent =
      error.message;

    return;
  }

  currentUser =
    data.user;

  await loadCloudTrades();

  hideLogin();

  showUserPanel();
}


/* =========================================================
   ПАНЕЛЬ ПОЛЬЗОВАТЕЛЯ
   ========================================================= */

function showUserPanel() {

  if (!currentUser)
    return;

  let panel =
    document.getElementById(
      "userAccountPanel"
    );

  if (!panel) {

    panel =
      document.createElement("div");

    panel.id =
      "userAccountPanel";

    panel.style.cssText = `
      position:fixed;
      right:18px;
      bottom:18px;
      z-index:500;
      background:#121a24;
      border:1px solid #253244;
      border-radius:12px;
      padding:10px 12px;
      box-shadow:0 10px 30px rgba(0,0,0,.35);
    `;

    document.body.appendChild(panel);
  }

  panel.innerHTML = `

    <div style="
      font-size:12px;
      color:#7f8c9b;
      margin-bottom:7px;
      max-width:220px;
      overflow:hidden;
      text-overflow:ellipsis;
    ">
      👤 ${escapeHtml(currentUser.email)}
    </div>

    <button
      id="logoutBtn"
      class="secondary"
      style="
        padding:7px 10px;
        font-size:12px;
      "
    >
      Выйти
    </button>
  `;

  $("logoutBtn").onclick =
    logoutUser;
}


async function logoutUser() {

  await db.auth.signOut();

  currentUser = null;

  trades = [];

  const panel =
    document.getElementById(
      "userAccountPanel"
    );

  if (panel)
    panel.remove();

  showLogin();

  render();
}


/* =========================================================
   ЗАГРУЗКА СДЕЛОК ИЗ SUPABASE
   ========================================================= */

async function loadCloudTrades() {

  if (!currentUser)
    return;

  const {
    data,
    error
  } = await db
    .from("trades")
    .select("*")
    .eq(
      "user_id",
      currentUser.id
    )
    .order("date", {
      ascending: true
    });

  if (error) {

    console.error(error);

    alert(
      "Ошибка загрузки сделок: " +
      error.message
    );

    return;
  }

  trades = data || [];

  trades = trades.map(t => ({

    id: t.id,

    date: t.date,

    symbol: t.symbol || "BTCUSDT",

    session: t.session || "London",

    direction:
      t.direction || "LONG",

    result:
      t.result || "be",

    pl:
      Number(t.pl || 0),

    setup:
      t.setup || "",

    entryTime:
      t.entry_time || "",

    discipline:
      t.discipline || "yes",

    comment:
      t.comment || ""
  }));

  render();
}


/* =========================================================
   ПЕРЕНОС СТАРЫХ СДЕЛОК
   ========================================================= */

async function migrateOldTrades() {

  if (!currentUser)
    return;

  const old =
    JSON.parse(
      localStorage.getItem(
        TRADES_KEY
      ) || "[]"
    );

  if (!Array.isArray(old))
    return;

  if (!old.length)
    return;

  const answer =
    confirm(
      `Найдено ${old.length} старых сделок в браузере.\n\nПеренести их в твой аккаунт Supabase?`
    );

  if (!answer)
    return;

  const rows =
    old.map(t => ({

      user_id:
        currentUser.id,

      date:
        t.date || null,

      symbol:
        t.symbol || "BTCUSDT",

      session:
        t.session || "London",

      direction:
        t.direction || "LONG",

      result:
        t.result || "be",

      pl:
        Number(t.pl || 0),

      setup:
        t.setup || "",

      entry_time:
        t.entryTime || "",

      discipline:
        t.discipline || "yes",

      comment:
        t.comment || ""
    }));

  const {
    error
  } = await db
    .from("trades")
    .insert(rows);

  if (error) {

    console.error(error);

    alert(
      "Не удалось перенести старые сделки:\n" +
      error.message
    );

    return;
  }

  localStorage.removeItem(
    TRADES_KEY
  );

  await loadCloudTrades();

  alert(
    "Старые сделки успешно перенесены!"
  );
}


/* =========================================================
   ДОБАВЛЕНИЕ СДЕЛКИ
   ========================================================= */

async function addTradeToCloud(trade) {

  if (!currentUser) {

    showLogin();

    return false;
  }

  const row = {

    user_id:
      currentUser.id,

    date:
      trade.date || null,

    symbol:
      trade.symbol,

    session:
      trade.session,

    direction:
      trade.direction,

    result:
      trade.result,

    pl:
      Number(trade.pl || 0),

    setup:
      trade.setup || "",

    entry_time:
      trade.entryTime || "",

    discipline:
      trade.discipline || "yes",

    comment:
      trade.comment || ""
  };

  const {
    data,
    error
  } = await db
    .from("trades")
    .insert(row)
    .select()
    .single();

  if (error) {

    console.error(error);

    alert(
      "Ошибка сохранения сделки:\n" +
      error.message
    );

    return false;
  }

  trades.push({

    id: data.id,

    date: data.date,

    symbol: data.symbol,

    session: data.session,

    direction: data.direction,

    result: data.result,

    pl: Number(data.pl || 0),

    setup: data.setup || "",

    entryTime:
      data.entry_time || "",

    discipline:
      data.discipline || "yes",

    comment:
      data.comment || ""
  });

  render();

  return true;
}


/* =========================================================
   ФОРМАТ
   ========================================================= */

function formatPL(value) {

  value =
    Number(value) || 0;

  return (
    value >= 0 ? "+" : ""
  ) +
    value.toFixed(2) +
    "%";
}


function formatDollar(value) {

  value =
    Number(value) || 0;

  return (
    value >= 0 ? "+" : "-"
  ) +
    "$" +
    Math.abs(value).toFixed(2);
}


function escapeHtml(value) {

  return String(
    value ?? ""
  ).replace(
    /[&<>"']/g,
    m => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[m])
  );
}


/* =========================================================
   НАСТРОЙКИ
   ========================================================= */

try {

  const saved =
    JSON.parse(
      localStorage.getItem(
        SETTINGS_KEY
      ) || "{}"
    );

  if (
    saved.deposit !== undefined
  )
    settings.deposit =
      Number(saved.deposit);

  if (
    saved.risk !== undefined
  )
    settings.risk =
      Number(saved.risk);

} catch (e) {}


if ($("initialDeposit"))
  $("initialDeposit").value =
    settings.deposit;

if ($("riskPercent"))
  $("riskPercent").value =
    settings.risk;

if ($("date"))
  $("date").value =
    new Date()
      .toISOString()
      .slice(0, 10);


/* =========================================================
   СТАТИСТИКА
   ========================================================= */

function stats(list) {

  const count =
    list.length;

  const wins =
    list.filter(
      t => t.result === "win"
    ).length;

  const pl =
    list.reduce(
      (s, t) =>
        s + Number(t.pl || 0),
      0
    );

  return {

    count,

    winrate:
      count
        ? Math.round(
            wins / count * 100
          )
        : 0,

    pl
  };
}


/* =========================================================
   ФИЛЬТРЫ
   ========================================================= */

function getFilteredTrades() {

  if (!$("filterFrom"))
    return trades;

  const from =
    $("filterFrom").value;

  const to =
    $("filterTo").value;

  const session =
    $("filterSession").value;

  const direction =
    $("filterDirection").value;

  const result =
    $("filterResult").value;

  const discipline =
    $("filterDiscipline").value;

  return trades.filter(t => {

    if (
      from &&
      t.date < from
    )
      return false;

    if (
      to &&
      t.date > to
    )
      return false;

    if (
      session !== "all" &&
      t.session !== session
    )
      return false;

    if (
      direction !== "all" &&
      t.direction !== direction
    )
      return false;

    if (
      result !== "all" &&
      t.result !== result
    )
      return false;

    if (
      discipline !== "all" &&
      t.discipline !== discipline
    )
      return false;

    return true;
  });
}


/* =========================================================
   ОСНОВНОЙ RENDER
   ========================================================= */

function render() {

  const count =
    trades.length;

  const wins =
    trades.filter(
      t => t.result === "win"
    ).length;

  const tp =
    wins;

  const sl =
    trades.filter(
      t => t.result === "loss"
    ).length;

  const be =
    trades.filter(
      t => t.result === "be"
    ).length;

  const disciplined =
    trades.filter(
      t => t.discipline === "yes"
    ).length;

  const totalPL =
    trades.reduce(
      (s, t) =>
        s + Number(t.pl || 0),
      0
    );

  const average =
    count
      ? totalPL / count
      : 0;

  const initial =
    Number(settings.deposit) || 0;

  let balance =
    initial;

  let peak =
    initial;

  let maxDD =
    0;

  let bestTrade =
    count
      ? Math.max(
          ...trades.map(
            t => Number(t.pl || 0)
          )
        )
      : 0;

  const values =
    [balance];

  for (const t of trades) {

    const pl =
      Number(t.pl || 0);

    balance *=
      1 + pl / 100;

    values.push(balance);

    if (balance > peak)
      peak = balance;

    if (peak > 0) {

      const dd =
        (peak - balance) /
        peak *
        100;

      maxDD =
        Math.max(
          maxDD,
          dd
        );
    }
  }

  const pnlMoney =
    balance - initial;


  if ($("count"))
    $("count").textContent =
      count;

  if ($("winrate"))
    $("winrate").textContent =
      count
        ? Math.round(
            wins / count * 100
          ) + "%"
        : "0%";

  if ($("discipline"))
    $("discipline").textContent =
      count
        ? Math.round(
            disciplined /
            count *
            100
          ) + "%"
        : "0%";

  if ($("pnl"))
    $("pnl").textContent =
      formatPL(totalPL);

  if ($("pnlDollar"))
    $("pnlDollar").textContent =
      formatDollar(pnlMoney);

  if ($("pnlMoney"))
    $("pnlMoney").textContent =
      formatDollar(pnlMoney);

  if ($("balance"))
    $("balance").textContent =
      "$" +
      balance.toFixed(2);

  if ($("avg"))
    $("avg").textContent =
      formatPL(average);

  if ($("tpCount"))
    $("tpCount").textContent =
      tp;

  if ($("slCount"))
    $("slCount").textContent =
      sl;

  if ($("beCount"))
    $("beCount").textContent =
      be;

  if ($("bestTrade"))
    $("bestTrade").textContent =
      formatPL(bestTrade);

  if ($("drawdown"))
    $("drawdown").textContent =
      "-" +
      maxDD.toFixed(2) +
      "%";

  if ($("riskDrawdown"))
    $("riskDrawdown").textContent =
      "-" +
      maxDD.toFixed(2) +
      "%";


  /* ИСТОРИЯ */

  if ($("trades")) {

    const filtered =
      getFilteredTrades();

    if ($("empty"))
      $("empty").style.display =
        filtered.length
          ? "none"
          : "block";

    $("trades").innerHTML =
      filtered
        .slice()
        .reverse()
        .map(t => `

          <tr>

            <td>
              ${escapeHtml(t.date)}
            </td>

            <td>
              ${escapeHtml(t.symbol)}
            </td>

            <td>
              ${escapeHtml(t.session)}
            </td>

            <td>
              ${escapeHtml(t.direction)}
            </td>

            <td class="${t.result}">
              <span class="badge ${t.result}">
                ${
                  t.result === "win"
                    ? "TP"
                    : t.result === "loss"
                      ? "SL"
                      : "BE"
                }
              </span>
            </td>

            <td class="${
              Number(t.pl || 0) >= 0
                ? "win"
                : "loss"
            }">

              ${formatPL(
                Number(t.pl || 0)
              )}

            </td>

            <td>
              ${
                t.discipline === "yes"
                  ? "Да"
                  : "Нет"
              }
            </td>

            <td>
              ${escapeHtml(
                t.comment ||
                t.setup ||
                "—"
              )}
            </td>

          </tr>

        `)
        .join("");
  }


  renderAnalytics();
  renderAdvancedAnalytics();
  renderSetupAnalytics();
  renderHourAnalytics();
  renderMonthly();

  drawEquity(values);
  drawEquity2();


  if ($("chartDeposit"))
    $("chartDeposit").textContent =
      "$" +
      initial.toFixed(2);

  if ($("chartBalance"))
    $("chartBalance").textContent =
      "$" +
      balance.toFixed(2);

  if ($("chartPL"))
    $("chartPL").textContent =
      formatPL(totalPL);

  if ($("chartDD"))
    $("chartDD").textContent =
      "-" +
      maxDD.toFixed(2) +
      "%";
}


/* =========================================================
   АНАЛИТИКА
   ========================================================= */

function renderAnalytics() {

  const london =
    stats(
      trades.filter(
        t => t.session === "London"
      )
    );

  const ny =
    stats(
      trades.filter(
        t => t.session === "New York"
      )
    );

  const long =
    stats(
      trades.filter(
        t => t.direction === "LONG"
      )
    );

  const short =
    stats(
      trades.filter(
        t => t.direction === "SHORT"
      )
    );

  const yes =
    stats(
      trades.filter(
        t => t.discipline === "yes"
      )
    );

  const no =
    stats(
      trades.filter(
        t => t.discipline === "no"
      )
    );


  setText(
    "londonCount",
    london.count
  );

  setText(
    "londonWinrate",
    london.winrate + "%"
  );

  setText(
    "londonPL",
    formatPL(london.pl)
  );


  setText(
    "nyCount",
    ny.count
  );

  setText(
    "nyWinrate",
    ny.winrate + "%"
  );

  setText(
    "nyPL",
    formatPL(ny.pl)
  );


  setText(
    "longCount",
    long.count
  );

  setText(
    "longWinrate",
    long.winrate + "%"
  );

  setText(
    "longPL",
    formatPL(long.pl)
  );


  setText(
    "shortCount",
    short.count
  );

  setText(
    "shortWinrate",
    short.winrate + "%"
  );

  setText(
    "shortPL",
    formatPL(short.pl)
  );


  setText(
    "yesCount",
    yes.count
  );

  setText(
    "yesWinrate",
    yes.winrate + "%"
  );

  setText(
    "yesPL",
    formatPL(yes.pl)
  );


  setText(
    "noCount",
    no.count
  );

  setText(
    "noWinrate",
    no.winrate + "%"
  );

  setText(
    "noPL",
    formatPL(no.pl)
  );


  setText(
    "disciplineDifference",
    formatPL(
      yes.pl - no.pl
    )
  );


  setText(
    "bestSession",
    london.count ||
    ny.count
      ? london.pl >= ny.pl
        ? "London"
        : "New York"
      : "—"
  );


  setText(
    "bestDirection",
    long.count ||
    short.count
      ? long.pl >= short.pl
        ? "LONG"
        : "SHORT"
      : "—"
  );
}


/* =========================================================
   РАСШИРЕННАЯ АНАЛИТИКА
   ========================================================= */

function renderAdvancedAnalytics() {

  const winning =
    trades.filter(
      t => t.result === "win"
    );

  const losing =
    trades.filter(
      t => t.result === "loss"
    );


  const grossProfit =
    winning.reduce(
      (s, t) =>
        s +
        Math.max(
          0,
          Number(t.pl || 0)
        ),
      0
    );


  const grossLoss =
    Math.abs(
      losing.reduce(
        (s, t) =>
          s +
          Math.min(
            0,
            Number(t.pl || 0)
          ),
        0
      )
    );


  let factor = 0;

  if (grossLoss > 0)
    factor =
      grossProfit /
      grossLoss;

  if (
    grossProfit > 0 &&
    grossLoss === 0
  )
    factor = Infinity;


  setText(
    "profitFactor",
    factor === Infinity
      ? "∞"
      : factor.toFixed(2)
  );

  setText(
    "ratingPF",
    factor === Infinity
      ? "∞"
      : factor.toFixed(2)
  );


  const avgTP =
    winning.length
      ? winning.reduce(
          (s, t) =>
            s + Number(t.pl || 0),
          0
        ) /
        winning.length
      : 0;


  const avgSL =
    losing.length
      ? losing.reduce(
          (s, t) =>
            s + Number(t.pl || 0),
          0
        ) /
        losing.length
      : 0;


  setText(
    "avgTP",
    formatPL(avgTP)
  );

  setText(
    "avgSL",
    formatPL(avgSL)
  );

  setText(
    "avgWin",
    formatPL(avgTP)
  );

  setText(
    "avgLoss",
    formatPL(avgSL)
  );


  /* СЕРИИ */

  let currentWin = 0;
  let currentLoss = 0;

  let maxWin = 0;
  let maxLoss = 0;

  for (const t of trades) {

    if (
      t.result === "win"
    ) {

      currentWin++;
      currentLoss = 0;

      maxWin =
        Math.max(
          maxWin,
          currentWin
        );

    } else if (
      t.result === "loss"
    ) {

      currentLoss++;
      currentWin = 0;

      maxLoss =
        Math.max(
          maxLoss,
          currentLoss
        );

    } else {

      currentWin = 0;
      currentLoss = 0;
    }
  }


  setText(
    "maxWinStreak",
    maxWin
  );

  setText(
    "maxLossStreak",
    maxLoss
  );


  let streak = 0;
  let type = "";

  if (trades.length) {

    const last =
      trades[
        trades.length - 1
      ].result;

    if (
      last === "win" ||
      last === "loss"
    ) {

      type = last;

      for (
        let i =
          trades.length - 1;
        i >= 0;
        i--
      ) {

        if (
          trades[i].result === last
        )
          streak++;
        else
          break;
      }
    }
  }


  setText(
    "currentStreak",
    streak
  );

  setText(
    "currentStreakType",
    type === "win"
      ? "Победы"
      : type === "loss"
        ? "Убытки"
        : "—"
  );


  /* РЕЙТИНГ */

  const count =
    trades.length;

  const wins =
    winning.length;

  const disciplined =
    trades.filter(
      t =>
        t.discipline === "yes"
    ).length;

  const winRate =
    count
      ? wins / count * 100
      : 0;

  const disciplineRate =
    count
      ? disciplined /
        count *
        100
      : 0;


  let pfScore = 0;

  if (
    factor === Infinity
  )
    pfScore = 100;

  else if (factor > 0)
    pfScore =
      Math.min(
        100,
        factor / 2 * 100
      );


  const rating =
    Math.round(
      Math.min(
        100,

        winRate * .4 +

        disciplineRate * .4 +

        pfScore * .2
      )
    );


  setText(
    "rating",
    rating
  );

  setText(
    "ratingWinrate",
    Math.round(
      winRate
    ) + "%"
  );

  setText(
    "ratingDiscipline",
    Math.round(
      disciplineRate
    ) + "%"
  );


  if ($("ratingBar"))
    $("ratingBar").style.width =
      rating + "%";


  setText(
    "ratingTitle",

    !count
      ? "Нет данных"

      : rating >= 80
        ? "🔥 Отличная торговля"

      : rating >= 60
        ? "💪 Хороший результат"

      : rating >= 40
        ? "⚠️ Есть что улучшить"

      : "🛑 Нужно пересмотреть торговлю"
  );


  /* РИСК */

  const deposit =
    Number(settings.deposit) || 0;

  const risk =
    Number(settings.risk) || 0;

  const riskDollar =
    deposit *
    risk /
    100;


  setText(
    "riskDisplay",
    risk.toFixed(2) + "%"
  );

  setText(
    "riskDollar",
    riskDollar.toFixed(2) + "$"
  );

  setText(
    "rewardDollar",
    (riskDollar * 2)
      .toFixed(2) +
      "$"
  );


  /* ДНИ */

  const daily = {};

  for (const t of trades) {

    if (!daily[t.date])
      daily[t.date] = 0;

    daily[t.date] +=
      Number(t.pl || 0);
  }


  const days =
    Object.entries(daily);


  if (days.length) {

    let best =
      days[0];

    let worst =
      days[0];


    for (
      const d of days
    ) {

      if (
        d[1] > best[1]
      )
        best = d;

      if (
        d[1] < worst[1]
      )
        worst = d;
    }


    setText(
      "bestDay",
      best[0]
    );

    setText(
      "bestDayPL",
      formatPL(best[1])
    );

    setText(
      "worstDay",
      worst[0]
    );

    setText(
      "worstDayPL",
      formatPL(worst[1])
    );

  } else {

    setText(
      "bestDay",
      "—"
    );

    setText(
      "worstDay",
      "—"
    );

    setText(
      "bestDayPL",
      "0%"
    );

    setText(
      "worstDayPL",
      "0%"
    );
  }


  /* МЕСЯЦЫ */

  const months = {};

  for (
    const t of trades
  ) {

    const m =
      t.date
        ? t.date.slice(0, 7)
        : "";

    if (!m)
      continue;

    if (!months[m]) {

      months[m] = {
        count: 0,
        wins: 0,
        pl: 0
      };
    }

    months[m].count++;

    months[m].pl +=
      Number(t.pl || 0);

    if (
      t.result === "win"
    )
      months[m].wins++;
  }


  let bestMonth = null;

  for (
    const m of
    Object.entries(months)
  ) {

    if (
      !bestMonth ||
      m[1].pl >
      bestMonth[1].pl
    )
      bestMonth = m;
  }


  if (bestMonth) {

    setText(
      "bestMonth",
      bestMonth[0]
    );

    setText(
      "bestMonthPL",
      formatPL(
        bestMonth[1].pl
      )
    );

    setText(
      "bestMonthWinrate",
      Math.round(
        bestMonth[1].wins /
        bestMonth[1].count *
        100
      ) + "%"
    );

    setText(
      "bestMonthCount",
      bestMonth[1].count
    );

  } else {

    setText(
      "bestMonth",
      "—"
    );

    setText(
      "bestMonthPL",
      "0%"
    );

    setText(
      "bestMonthWinrate",
      "0%"
    );

    setText(
      "bestMonthCount",
      "0"
    );
  }
}


/* =========================================================
   SETUP ANALYTICS
   ========================================================= */

function renderSetupAnalytics() {

  const names = [
    "Liquidity Sweep",
    "BOS",
    "FVG"
  ];

  const data = {};

  names.forEach(
    n => {

      data[n] = {
        count: 0,
        wins: 0,
        tp: 0,
        sl: 0,
        pl: 0
      };
    }
  );


  let comboTrades = 0;
  let comboWins = 0;
  let comboPL = 0;


  for (
    const t of trades
  ) {

    const text =
      (
        (t.setup || "") +
        " " +
        (t.comment || "")
      ).toLowerCase();

    const found = [];


    if (
      text.includes(
        "liquidity sweep"
      ) ||
      text.includes(
        "liquidity"
      ) ||
      text.includes(
        "sweep"
      )
    )
      found.push(
        "Liquidity Sweep"
      );


    if (
      text.includes("bos") ||
      text.includes(
        "break of structure"
      )
    )
      found.push("BOS");


    if (
      text.includes("fvg") ||
      text.includes(
        "fair value gap"
      )
    )
      found.push("FVG");


    if (
      found.length >= 2
    ) {

      comboTrades++;

      comboPL +=
        Number(t.pl || 0);

      if (
        t.result === "win"
      )
        comboWins++;
    }


    for (
      const n of found
    ) {

      data[n].count++;

      data[n].pl +=
        Number(t.pl || 0);

      if (
        t.result === "win"
      ) {

        data[n].wins++;
        data[n].tp++;
      }

      if (
        t.result === "loss"
      )
        data[n].sl++;
    }
  }


  if ($("setupStats")) {

    $("setupStats").innerHTML =
      names.map(
        n => {

          const d =
            data[n];

          const wr =
            d.count
              ? Math.round(
                  d.wins /
                  d.count *
                  100
                )
              : 0;

          const avg =
            d.count
              ? d.pl /
                d.count
              : 0;

          return `

            <tr>

              <td>
                <strong>
                  ${n}
                </strong>
              </td>

              <td>
                ${d.count}
              </td>

              <td>
                ${wr}%
              </td>

              <td>
                ${d.tp}
              </td>

              <td>
                ${d.sl}
              </td>

              <td class="${
                d.pl >= 0
                  ? "win"
                  : "loss"
              }">
                ${formatPL(d.pl)}
              </td>

              <td class="${
                avg >= 0
                  ? "win"
                  : "loss"
              }">
                ${formatPL(avg)}
              </td>

            </tr>
          `;
        }
      ).join("");
  }


  const available =
    names
      .map(
        n => [
          n,
          data[n]
        ]
      )
      .filter(
        x => x[1].count > 0
      );


  if (available.length) {

    let best =
      available[0];

    let worst =
      available[0];


    for (
      const x of available
    ) {

      if (
        x[1].pl >
        best[1].pl
      )
        best = x;

      if (
        x[1].pl <
        worst[1].pl
      )
        worst = x;
    }


    setText(
      "bestSetup",
      best[0]
    );

    setText(
      "bestSetupPL",
      formatPL(
        best[1].pl
      )
    );

    setText(
      "bestSetupWinrate",
      Math.round(
        best[1].wins /
        best[1].count *
        100
      ) + "%"
    );


    setText(
      "worstSetup",
      worst[0]
    );

    setText(
      "worstSetupPL",
      formatPL(
        worst[1].pl
      )
    );

    setText(
      "worstSetupWinrate",
      Math.round(
        worst[1].wins /
        worst[1].count *
        100
      ) + "%"
    );

  }


  setText(
    "comboCount",
    comboTrades
  );

  setText(
    "comboWinrate",
    comboTrades
      ? Math.round(
          comboWins /
          comboTrades *
          100
        ) + "%"
      : "0%"
  );

  setText(
    "comboPL",
    formatPL(comboPL)
  );
}


/* =========================================================
   АНАЛИТИКА ПО ЧАСАМ
   ========================================================= */

function renderHourAnalytics() {

  if (!$("hourStats"))
    return;

  const hours = {};

  for (
    const t of trades
  ) {

    if (!t.entryTime)
      continue;

    const hour =
      t.entryTime.slice(0, 2);

    if (!hours[hour]) {

      hours[hour] = {
        count: 0,
        wins: 0,
        pl: 0
      };
    }

    hours[hour].count++;

    hours[hour].pl +=
      Number(t.pl || 0);

    if (
      t.result === "win"
    )
      hours[hour].wins++;
  }


  const entries =
    Object.entries(hours)
      .sort(
        (a, b) =>
          a[0].localeCompare(
            b[0]
          )
      );


  if ($("hourEmpty"))
    $("hourEmpty").style.display =
      entries.length
        ? "none"
        : "block";


  $("hourStats").innerHTML =
    entries.map(
      ([hour, d]) => {

        const wr =
          Math.round(
            d.wins /
            d.count *
            100
          );

        const avg =
          d.pl /
          d.count;

        return `

          <tr>

            <td>
              <strong>
                ${hour}:00
              </strong>
            </td>

            <td>
              ${d.count}
            </td>

            <td>
              ${wr}%
            </td>

            <td class="${
              d.pl >= 0
                ? "win"
                : "loss"
            }">
              ${formatPL(d.pl)}
            </td>

            <td class="${
              avg >= 0
                ? "win"
                : "loss"
            }">
              ${formatPL(avg)}
            </td>

          </tr>
        `;
      }
    ).join("");
}


/* =========================================================
   МЕСЯЧНАЯ АНАЛИТИКА
   ========================================================= */

function renderMonthly() {

  if (!$("monthlyStats"))
    return;

  const months = {};

  for (
    const t of trades
  ) {

    const m =
      t.date
        ? t.date.slice(0, 7)
        : "";

    if (!m)
      continue;

    if (!months[m]) {

      months[m] = {
        count: 0,
        wins: 0,
        tp: 0,
        sl: 0,
        pl: 0
      };
    }

    months[m].count++;

    months[m].pl +=
      Number(t.pl || 0);

    if (
      t.result === "win"
    ) {

      months[m].wins++;
      months[m].tp++;
    }

    if (
      t.result === "loss"
    )
      months[m].sl++;
  }


  const entries =
    Object.entries(months)
      .sort(
        (a, b) =>
          b[0].localeCompare(
            a[0]
          )
      );


  if ($("monthlyEmpty"))
    $("monthlyEmpty").style.display =
      entries.length
        ? "none"
        : "block";


  $("monthlyStats").innerHTML =
    entries.map(
      ([m, d]) => `

        <tr>

          <td>
            ${escapeHtml(m)}
          </td>

          <td>
            ${d.count}
          </td>

          <td>
            ${Math.round(
              d.wins /
              d.count *
              100
            )}%
          </td>

          <td>
            ${d.tp}
          </td>

          <td>
            ${d.sl}
          </td>

          <td class="${
            d.pl >= 0
              ? "win"
              : "loss"
          }">
            ${formatPL(d.pl)}
          </td>

        </tr>
      `
    ).join("");
}


/* =========================================================
   ГРАФИК
   ========================================================= */

function drawEquity(values) {

  const canvas =
    $("equity");

  if (!canvas)
    return;

  drawCanvas(
    canvas,
    values
  );
}


function drawEquity2() {

  const canvas =
    $("equity2");

  if (!canvas)
    return;

  let balance =
    Number(settings.deposit) || 0;

  const values =
    [balance];

  for (
    const t of trades
  ) {

    balance *=
      1 +
      Number(t.pl || 0) /
      100;

    values.push(balance);
  }

  drawCanvas(
    canvas,
    values
  );
}


function drawCanvas(
  canvas,
  values
) {

  const ctx =
    canvas.getContext("2d");

  const W =
    canvas.width;

  const H =
    canvas.height;

  ctx.clearRect(
    0,
    0,
    W,
    H
  );


  if (
    values.length < 2
  ) {

    ctx.fillStyle =
      "#66717e";

    ctx.font =
      "16px Arial";

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


  ctx.strokeStyle =
    "#1c2937";

  ctx.lineWidth = 1;


  for (
    let i = 1;
    i < 5;
    i++
  ) {

    const y =
      25 +
      i *
      (H - 50) /
      5;

    ctx.beginPath();

    ctx.moveTo(
      25,
      y
    );

    ctx.lineTo(
      W - 25,
      y
    );

    ctx.stroke();
  }


  ctx.beginPath();


  values.forEach(
    (value, i) => {

      const x =
        25 +
        i *
        (W - 50) /
        (values.length - 1);

      const y =
        H -
        25 -
        (
          value - min
        ) /
        (max - min) *
        (H - 50);


      if (i === 0)
        ctx.moveTo(x, y);

      else
        ctx.lineTo(x, y);
    }
  );


  ctx.strokeStyle =
    "#60a5fa";

  ctx.lineWidth = 3;

  ctx.stroke();


  ctx.fillStyle =
    "#60a5fa";


  values.forEach(
    (value, i) => {

      const x =
        25 +
        i *
        (W - 50) /
        (values.length - 1);

      const y =
        H -
        25 -
        (
          value - min
        ) /
        (max - min) *
        (H - 50);


      ctx.beginPath();

      ctx.arc(
        x,
        y,
        4,
        0,
        Math.PI * 2
      );

      ctx.fill();
    }
  );
}


/* =========================================================
   НАСТРОЙКИ
   ========================================================= */

if ($("saveSettings")) {

  $("saveSettings").onclick =
    () => {

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
        SETTINGS_KEY,
        JSON.stringify(
          settings
        )
      );


      render();

      alert(
        "Настройки сохранены"
      );
    };
}


/* =========================================================
   ДОБАВЛЕНИЕ СДЕЛКИ
   ========================================================= */

if ($("tradeForm")) {

  $("tradeForm").onsubmit =
    async event => {

      event.preventDefault();


      if (!currentUser) {

        showLogin();

        return;
      }


      const trade = {

        date:
          $("date").value,

        symbol:
          $("symbol")
            .value
            .trim(),

        session:
          $("session").value,

        direction:
          $("direction").value,

        result:
          $("result").value,

        pl:
          Number(
            $("pl").value
          ),

        setup:
          $("setup")
            .value
            .trim(),

        entryTime:
          $("entryTime")
            ? $("entryTime").value
            : "",

        discipline:
          $("disciplineInput")
            .value,

        comment:
          $("comment")
            .value
            .trim()
      };


      const saved =
        await addTradeToCloud(
          trade
        );


      if (!saved)
        return;


      event.target.reset();


      if ($("date"))
        $("date").value =
          new Date()
            .toISOString()
            .slice(0, 10);


      if ($("symbol"))
        $("symbol").value =
          "BTCUSDT";


      alert(
        "Сделка сохранена в аккаунте!"
      );


      if (
        typeof openPage ===
        "function"
      )
        openPage("history");
    };
}


/* =========================================================
   НАВИГАЦИЯ
   ========================================================= */

document
  .querySelectorAll(
    ".nav button"
  )
  .forEach(btn => {

    btn.onclick = () => {

      document
        .querySelectorAll(
          ".nav button"
        )
        .forEach(
          b =>
            b.classList.remove(
              "active"
            )
        );

      btn.classList.add(
        "active"
      );


      document
        .querySelectorAll(
          ".page"
        )
        .forEach(
          p =>
            p.classList.remove(
              "active"
            )
        );


      const page =
        $(btn.dataset.page);

      if (page)
        page.classList.add(
          "active"
        );


      if (
        btn.dataset.page ===
        "charts"
      )
        drawEquity2();


      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });
    };
  });


function openPage(name) {

  document
    .querySelectorAll(
      ".nav button"
    )
    .forEach(
      b =>
        b.classList.toggle(
          "active",
          b.dataset.page ===
          name
        )
    );


  document
    .querySelectorAll(
      ".page"
    )
    .forEach(
      p =>
        p.classList.toggle(
          "active",
          p.id === name
        )
    );


  if (
    name === "charts"
  )
    drawEquity2();


  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


/* =========================================================
   ФИЛЬТРЫ
   ========================================================= */

[
  "filterFrom",
  "filterTo",
  "filterSession",
  "filterDirection",
  "filterResult",
  "filterDiscipline"
].forEach(id => {

  const element =
    $(id);

  if (!element)
    return;

  element.addEventListener(
    "change",
    render
  );
});


if ($("resetFilters")) {

  $("resetFilters").onclick =
    () => {

      $("filterFrom").value =
        "";

      $("filterTo").value =
        "";

      $("filterSession").value =
        "all";

      $("filterDirection").value =
        "all";

      $("filterResult").value =
        "all";

      $("filterDiscipline").value =
        "all";

      render();
    };
}


/* =========================================================
   ОЧИСТКА ИСТОРИИ
   ========================================================= */

if ($("clearAll")) {

  $("clearAll").onclick =
    async () => {

      if (
        !confirm(
          "Удалить всю историю сделок из аккаунта?"
        )
      )
        return;


      if (!currentUser)
        return;


      const {
        error
      } = await db
        .from("trades")
        .delete()
        .eq(
          "user_id",
          currentUser.id
        );


      if (error) {

        alert(
          "Ошибка удаления:\n" +
          error.message
        );

        return;
      }


      trades = [];

      render();
    };
}


/* =========================================================
   ЭКСПОРТ CSV
   ========================================================= */

function exportCSV() {

  const list =
    getFilteredTrades();


  const rows = [

    [
      "Дата",
      "Инструмент",
      "Сессия",
      "Направление",
      "Результат",
      "P/L %",
      "Сетап",
      "Время входа",
      "Стратегия",
      "Комментарий"
    ],

    ...list.map(
      t => [

        t.date,

        t.symbol,

        t.session,

        t.direction,

        t.result,

        t.pl,

        t.setup,

        t.entryTime || "",

        t.discipline,

        t.comment || ""
      ]
    )
  ];


  const csv =
    "\ufeff" +
    rows
      .map(
        row =>
          row
            .map(
              value =>
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
    document.createElement(
      "a"
    );


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
}


if ($("export"))
  $("export").onclick =
    exportCSV;

if ($("exportSettings"))
  $("exportSettings").onclick =
    exportCSV;


/* =========================================================
   ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ
   ========================================================= */

function setText(
  id,
  value
) {

  const element =
    $(id);

  if (element)
    element.textContent =
      value;
}


/* =========================================================
   ЗАПУСК
   ========================================================= */

createAuthUI();

render();

initSupabase()
  .then(
    () => {

      /*
       * После первого входа
       * спрашиваем про старые сделки.
       */

      if (currentUser) {

        setTimeout(
          migrateOldTrades,
          800
        );
      }
    }
  );
