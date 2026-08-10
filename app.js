```javascript
/* =========================================================
   TRADE JOURNAL
   SUPABASE + AUTH + TRADES
   ========================================================= */

const SUPABASE_URL =
  "https://mocxiqabmoehjkpsddld.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_LdhC8_unv5Yiq5cevuPxqw_MWxnMiau";

const K = "tradeJournalV1";
const S = "tradeJournalSettings";

const $ = id => document.getElementById(id);

let trades = [];
let settings = {
  deposit: 100,
  risk: 1
};

let currentUser = null;
let supabaseClient = null;


/* =========================================================
   ЗАГРУЗКА SUPABASE
   ========================================================= */

function loadSupabase() {

  return new Promise((resolve, reject) => {

    if (window.supabase) {
      resolve();
      return;
    }

    const script =
      document.createElement("script");

    script.src =
      "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";

    script.onload = resolve;

    script.onerror = () =>
      reject(
        new Error(
          "Не удалось загрузить Supabase"
        )
      );

    document.head.appendChild(script);
  });
}


/* =========================================================
   ИНИЦИАЛИЗАЦИЯ
   ========================================================= */

async function init() {

  try {

    await loadSupabase();

    supabaseClient =
      window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
      );

    await createAuthUI();

    const {
      data
    } =
      await supabaseClient.auth.getSession();

    currentUser =
      data.session?.user || null;

    updateAuthUI();

    if (currentUser) {

      await loadTradesFromSupabase();

      await migrateLocalTrades();

    } else {

      loadLocalTrades();

    }

    loadSettings();

    setupEvents();

    render();

  }

  catch (error) {

    console.error(error);

    alert(
      "Ошибка подключения к Supabase: " +
      error.message
    );
  }
}


/* =========================================================
   ЛОКАЛЬНЫЕ ДАННЫЕ
   ========================================================= */

function loadLocalTrades() {

  try {

    const saved =
      JSON.parse(
        localStorage.getItem(K) || "[]"
      );

    trades =
      Array.isArray(saved)
        ? saved
        : [];

  }

  catch {

    trades = [];
  }
}


function loadSettings() {

  try {

    settings =
      JSON.parse(
        localStorage.getItem(S) ||
        '{"deposit":100,"risk":1}'
      );

  }

  catch {

    settings = {
      deposit: 100,
      risk: 1
    };
  }

  if ($("date")) {

    $("date").value =
      new Date()
        .toISOString()
        .slice(0, 10);
  }

  if ($("initialDeposit")) {

    $("initialDeposit").value =
      settings.deposit;
  }

  if ($("riskPercent")) {

    $("riskPercent").value =
      settings.risk;
  }
}


/* =========================================================
   AUTH UI
   ========================================================= */

async function createAuthUI() {

  if ($("tradeAuthBox")) {
    return;
  }

  const box =
    document.createElement("div");

  box.id = "tradeAuthBox";

  box.innerHTML = `
    <div id="authLoggedOut">

      <button
        id="loginBtn"
        type="button"
        class="secondary"
      >
        🔑 Войти
      </button>

      <button
        id="registerBtn"
        type="button"
        class="primary"
      >
        👤 Регистрация
      </button>

    </div>

    <div
      id="authLoggedIn"
      style="display:none;align-items:center;gap:10px;flex-wrap:wrap"
    >

      <span
        id="userEmail"
        style="color:#aeb8c5"
      ></span>

      <button
        id="logoutBtn"
        type="button"
        class="secondary"
      >
        🚪 Выйти
      </button>

    </div>
  `;

  const header =
    document.querySelector(".siteHeader");

  if (header) {

    header.appendChild(box);

  } else {

    document.body.prepend(box);
  }

  addAuthStyles();

  $("loginBtn").onclick =
    () => showAuthModal("login");

  $("registerBtn").onclick =
    () => showAuthModal("register");

  $("logoutBtn").onclick =
    logout;
}


/* =========================================================
   AUTH STYLES
   ========================================================= */

function addAuthStyles() {

  if ($("authStyles")) {
    return;
  }

  const style =
    document.createElement("style");

  style.id = "authStyles";

  style.textContent = `

    #tradeAuthBox{
      margin-left:auto;
      display:flex;
      align-items:center;
      gap:8px;
    }

    #authLoggedOut{
      display:flex;
      gap:8px;
      align-items:center;
      flex-wrap:wrap;
    }

    #authLoggedOut .primary{
      margin-top:0;
    }

    .authOverlay{
      position:fixed;
      inset:0;
      background:rgba(0,0,0,.72);
      backdrop-filter:blur(8px);
      display:flex;
      align-items:center;
      justify-content:center;
      z-index:9999;
      padding:20px;
    }

    .authModal{
      width:min(420px,100%);
      background:#121a24;
      border:1px solid #253244;
      border-radius:18px;
      padding:24px;
      box-shadow:0 25px 80px rgba(0,0,0,.5);
    }

    .authModal h2{
      margin-top:0;
    }

    .authModal label{
      margin-top:14px;
    }

    .authModal input{
      margin-top:6px;
    }

    .authButtons{
      display:flex;
      gap:8px;
      margin-top:18px;
    }

    .authButtons button{
      flex:1;
    }

    .authMessage{
      margin-top:12px;
      color:#f87171;
      font-size:14px;
    }

    @media(max-width:800px){

      #tradeAuthBox{
        width:100%;
        margin-left:0;
      }

      #authLoggedOut{
        width:100%;
      }

    }
  `;

  document.head.appendChild(style);
}


/* =========================================================
   AUTH MODAL
   ========================================================= */

function showAuthModal(mode) {

  const old =
    $("authOverlay");

  if (old) {
    old.remove();
  }

  const overlay =
    document.createElement("div");

  overlay.className =
    "authOverlay";

  overlay.id =
    "authOverlay";

  const isLogin =
    mode === "login";

  overlay.innerHTML = `

    <div class="authModal">

      <h2>
        ${
          isLogin
            ? "🔑 Вход"
            : "👤 Создание аккаунта"
        }
      </h2>

      <p class="subtitle">
        ${
          isLogin
            ? "Войди в свой Trade Journal."
            : "Создай аккаунт и сохраняй сделки в облаке."
        }
      </p>

      <label>
        Email
        <input
          id="authEmail"
          type="email"
          placeholder="you@example.com"
          autocomplete="email"
        >
      </label>

      <label>
        Пароль
        <input
          id="authPassword"
          type="password"
          placeholder="Минимум 6 символов"
          autocomplete="${
            isLogin
              ? "current-password"
              : "new-password"
          }"
        >
      </label>

      <div class="authButtons">

        <button
          id="authSubmit"
          class="primary"
          type="button"
        >
          ${
            isLogin
              ? "Войти"
              : "Создать аккаунт"
          }
        </button>

        <button
          id="authCancel"
          class="secondary"
          type="button"
        >
          Отмена
        </button>

      </div>

      <div
        id="authMessage"
        class="authMessage"
      ></div>

    </div>
  `;

  document.body.appendChild(overlay);

  $("authCancel").onclick =
    () => overlay.remove();

  $("authSubmit").onclick =
    async () => {

      const email =
        $("authEmail").value.trim();

      const password =
        $("authPassword").value;

      const message =
        $("authMessage");

      message.textContent = "";

      if (!email) {

        message.textContent =
          "Введи email.";

        return;
      }

      if (password.length < 6) {

        message.textContent =
          "Пароль должен быть минимум 6 символов.";

        return;
      }

      $("authSubmit").disabled =
        true;

      try {

        if (isLogin) {

          const {
            data,
            error
          } =
            await supabaseClient.auth
              .signInWithPassword({
                email,
                password
              });

          if (error) {
            throw error;
          }

          currentUser =
            data.user;

          overlay.remove();

          await afterLogin();

        } else {

          const {
            data,
            error
          } =
            await supabaseClient.auth
              .signUp({
                email,
                password
              });

          if (error) {
            throw error;
          }

          if (data.session) {

            currentUser =
              data.user;

            overlay.remove();

            await afterLogin();

          } else {

            message.style.color =
              "#4ade80";

            message.textContent =
              "Аккаунт создан. Теперь войди в него.";

            setTimeout(() => {

              overlay.remove();

              showAuthModal("login");

            }, 1500);
          }
        }

      }

      catch (error) {

        console.error(error);

        message.style.color =
          "#f87171";

        message.textContent =
          translateAuthError(
            error.message
          );

        $("authSubmit").disabled =
          false;
      }
    };
}


/* =========================================================
   AUTH ERROR
   ========================================================= */

function translateAuthError(message) {

  const text =
    String(message || "");

  if (
    text.toLowerCase()
      .includes("invalid login credentials")
  ) {

    return "Неверный email или пароль.";
  }

  if (
    text.toLowerCase()
      .includes("password should be at least")
  ) {

    return "Пароль слишком короткий.";
  }

  if (
    text.toLowerCase()
      .includes("email")
  ) {

    return text;
  }

  return text;
}


/* =========================================================
   AFTER LOGIN
   ========================================================= */

async function afterLogin() {

  updateAuthUI();

  await loadTradesFromSupabase();

  await migrateLocalTrades();

  render();

  alert(
    "Вход выполнен. Твои сделки теперь сохраняются в аккаунте."
  );
}


/* =========================================================
   AUTH UI UPDATE
   ========================================================= */

function updateAuthUI() {

  const loggedOut =
    $("authLoggedOut");

  const loggedIn =
    $("authLoggedIn");

  const email =
    $("userEmail");

  if (!loggedOut || !loggedIn) {
    return;
  }

  if (currentUser) {

    loggedOut.style.display =
      "none";

    loggedIn.style.display =
      "flex";

    if (email) {

      email.textContent =
        "👤 " +
        (
          currentUser.email ||
          "Пользователь"
        );
    }

  } else {

    loggedOut.style.display =
      "flex";

    loggedIn.style.display =
      "none";
  }
}


/* =========================================================
   LOGOUT
   ========================================================= */

async function logout() {

  await supabaseClient.auth.signOut();

  currentUser = null;

  trades = [];

  updateAuthUI();

  render();

  alert("Ты вышел из аккаунта.");
}


/* =========================================================
   LOAD TRADES FROM SUPABASE
   ========================================================= */

async function loadTradesFromSupabase() {

  if (!currentUser) {
    return;
  }

  const {
    data,
    error
  } =
    await supabaseClient
      .from("trades")
      .select("*")
      .eq(
        "user_id",
        currentUser.id
      )
      .order("created_at", {
        ascending: true
      });

  if (error) {

    console.error(error);

    alert(
      "Не удалось загрузить сделки из Supabase:\n" +
      error.message
    );

    return;
  }

  trades =
    Array.isArray(data)
      ? data.map(normalizeTrade)
      : [];
}


/* =========================================================
   NORMALIZE
   ========================================================= */

function normalizeTrade(t) {

  return {

    id: t.id,

    date: t.date || "",

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

    entryTime:
      t.entry_time ||
      t.entryTime ||
      "",

    discipline:
      t.discipline || "yes",

    comment:
      t.comment || ""
  };
}


/* =========================================================
   SAVE TRADE TO SUPABASE
   ========================================================= */

async function saveTradeToSupabase(trade) {

  if (!currentUser) {
    return false;
  }

  const payload = {

    user_id:
      currentUser.id,

    date:
      trade.date,

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
  } =
    await supabaseClient
      .from("trades")
      .insert(payload)
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

  trade.id =
    data.id;

  return true;
}


/* =========================================================
   MIGRATE LOCAL TRADES
   ========================================================= */

async function migrateLocalTrades() {

  if (!currentUser) {
    return;
  }

  let localTrades = [];

  try {

    localTrades =
      JSON.parse(
        localStorage.getItem(K) || "[]"
      );

  }

  catch {

    localTrades = [];
  }

  if (
    !Array.isArray(localTrades) ||
    !localTrades.length
  ) {

    return;
  }

  const marker =
    "tradeJournalMigrated_" +
    currentUser.id;

  if (
    localStorage.getItem(marker)
  ) {

    return;
  }

  const confirmed =
    confirm(
      "Найдены сделки из старой версии журнала.\n\n" +
      "Перенести их в твой аккаунт?"
    );

  if (!confirmed) {
    return;
  }

  let imported = 0;

  for (const oldTrade of localTrades) {

    const trade =
      normalizeTrade(oldTrade);

    const ok =
      await saveTradeToSupabase(
        trade
      );

    if (ok) {
      imported++;
    }
  }

  localStorage.setItem(
    marker,
    "true"
  );

  await loadTradesFromSupabase();

  alert(
    "Перенесено сделок: " +
    imported
  );
}


/* =========================================================
   ESCAPE
   ========================================================= */

function esc(s) {

  return String(s ?? "")
    .replace(
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
   BALANCE
   ========================================================= */

function getBalance() {

  let balance =
    Number(
      settings.deposit || 0
    );

  for (const trade of trades) {

    balance *=
      1 +
      Number(trade.pl || 0) /
      100;
  }

  return balance;
}


/* =========================================================
   RENDER
   ========================================================= */

function render() {

  const count =
    trades.length;

  const wins =
    trades.filter(
      t => t.result === "win"
    ).length;

  const disciplined =
    trades.filter(
      t => t.discipline === "yes"
    ).length;

  const tpCount =
    wins;

  const slCount =
    trades.filter(
      t => t.result === "loss"
    ).length;

  const totalPL =
    trades.reduce(
      (sum, t) =>
        sum +
        Number(t.pl || 0),
      0
    );

  const average =
    count
      ? totalPL / count
      : 0;

  const bestTrade =
    count
      ? Math.max(
          ...trades.map(
            t =>
              Number(t.pl || 0)
          )
        )
      : 0;

  let balance =
    Number(
      settings.deposit || 0
    );

  let peak =
    balance;

  let maxDrawdown =
    0;

  for (const trade of trades) {

    balance *=
      1 +
      Number(trade.pl || 0) /
      100;

    if (balance > peak) {
      peak = balance;
    }

    if (peak > 0) {

      const drawdown =
        (peak - balance) /
        peak *
        100;

      if (
        drawdown >
        maxDrawdown
      ) {

        maxDrawdown =
          drawdown;
      }
    }
  }

  const pnlMoney =
    balance -
    Number(
      settings.deposit || 0
    );


  /* MAIN STATS */

  if ($("count"))
    $("count").textContent =
      count;

  if ($("winrate"))
    $("winrate").textContent =
      count
        ? Math.round(
            wins /
            count *
            100
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

  const moneyElement =
    $("pnlMoney") ||
    $("pnlDollar");

  if (moneyElement) {

    moneyElement.textContent =
      formatDollar(
        pnlMoney
      );
  }

  if ($("balance"))
    $("balance").textContent =
      "$" +
      balance.toFixed(2);

  if ($("avg"))
    $("avg").textContent =
      formatPL(average);

  if ($("tpCount"))
    $("tpCount").textContent =
      tpCount;

  if ($("slCount"))
    $("slCount").textContent =
      slCount;

  if ($("beCount"))
    $("beCount").textContent =
      trades.filter(
        t => t.result === "be"
      ).length;

  if ($("bestTrade"))
    $("bestTrade").textContent =
      formatPL(bestTrade);

  if ($("drawdown"))
    $("drawdown").textContent =
      "-" +
      maxDrawdown.toFixed(2) +
      "%";


  /* HISTORY */

  const empty =
    $("empty");

  if (empty)
    empty.style.display =
      count
        ? "none"
        : "block";

  const table =
    $("trades");

  if (table) {

    table.innerHTML =
      trades
        .slice()
        .reverse()
        .map(t => `

          <tr>

            <td>
              ${esc(t.date)}
            </td>

            <td>
              ${esc(t.symbol)}
            </td>

            <td>
              ${esc(t.session)}
            </td>

            <td>
              ${esc(t.direction)}
            </td>

            <td class="${esc(t.result)}">

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
  }

  draw();

  updateChartStats(
    balance,
    totalPL,
    maxDrawdown
  );
}


/* =========================================================
   FORMAT
   ========================================================= */

function formatPL(value) {

  value =
    Number(value) || 0;

  return (
    value >= 0
      ? "+"
      : ""
  ) +
    value.toFixed(2) +
    "%";
}


function formatDollar(value) {

  value =
    Number(value) || 0;

  return (
    value >= 0
      ? "+"
      : "-"
  ) +
    "$" +
    Math.abs(value)
      .toFixed(2);
}


/* =========================================================
   GRAPH
   ========================================================= */

function draw() {

  const canvas =
    $("equity");

  if (!canvas) {
    return;
  }

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

  let values = [
    Number(
      settings.deposit || 0
    )
  ];

  let balance =
    values[0];

  for (const trade of trades) {

    balance *=
      1 +
      Number(trade.pl || 0) /
      100;

    values.push(balance);
  }

  if (values.length < 2) {

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
    Math.min(
      ...values
    );

  let max =
    Math.max(
      ...values
    );

  if (min === max) {

    min -= 1;
    max += 1;
  }

  ctx.strokeStyle =
    "#1c2937";

  ctx.lineWidth =
    1;

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
    (value, index) => {

      const x =
        25 +
        index *
        (W - 50) /
        (values.length - 1);

      const y =
        H -
        25 -
        (
          value - min
        ) /
        (
          max - min
        ) *
        (H - 50);

      if (index === 0) {

        ctx.moveTo(
          x,
          y
        );

      } else {

        ctx.lineTo(
          x,
          y
        );
      }
    }
  );

  ctx.strokeStyle =
    "#60a5fa";

  ctx.lineWidth =
    3;

  ctx.stroke();

  ctx.fillStyle =
    "#60a5fa";

  values.forEach(
    (value, index) => {

      const x =
        25 +
        index *
        (W - 50) /
        (values.length - 1);

      const y =
        H -
        25 -
        (
          value - min
        ) /
        (
          max - min
        ) *
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
   CHART STATS
   ========================================================= */

function updateChartStats(
  balance,
  totalPL,
  drawdown
) {

  if ($("chartDeposit")) {

    $("chartDeposit").textContent =
      "$" +
      Number(
        settings.deposit || 0
      ).toFixed(2);
  }

  if ($("chartBalance")) {

    $("chartBalance").textContent =
      "$" +
      Number(
        balance || 0
      ).toFixed(2);
  }

  if ($("chartPL")) {

    $("chartPL").textContent =
      formatPL(
        totalPL
      );
  }

  if ($("chartDD")) {

    $("chartDD").textContent =
      "-" +
      Number(
        drawdown || 0
      ).toFixed(2) +
      "%";
  }
}


/* =========================================================
   SETTINGS
   ========================================================= */

function setupSettings() {

  const button =
    $("saveSettings");

  if (!button) {
    return;
  }

  button.onclick =
    () => {

      settings = {

        deposit:
          Number(
            $("initialDeposit")
              ?.value
          ) || 0,

        risk:
          Number(
            $("riskPercent")
              ?.value
          ) || 0
      };

      localStorage.setItem(
        S,
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
   ADD TRADE
   ========================================================= */

function setupTradeForm() {

  const form =
    $("tradeForm");

  if (!form) {
    return;
  }

  form.onsubmit =
    async event => {

      event.preventDefault();

      if (!currentUser) {

        alert(
          "Сначала войди или создай аккаунт."
        );

        showAuthModal("login");

        return;
      }

      const trade = {

        date:
          $("date")
            ?.value || "",

        symbol:
          $("symbol")
            ?.value
            .trim() ||
          "BTCUSDT",

        session:
          $("session")
            ?.value ||
          "London",

        direction:
          $("direction")
            ?.value ||
          "LONG",

        result:
          $("result")
            ?.value ||
          "be",

        pl:
          Number(
            $("pl")
              ?.value
          ) || 0,

        setup:
          $("setup")
            ?.value
            .trim() ||
          "",

        entryTime:
          $("entryTime")
            ?.value ||
          "",

        discipline:
          $("disciplineInput")
            ?.value ||
          "yes",

        comment:
          $("comment")
            ?.value
            .trim() ||
          ""
      };

      const saved =
        await saveTradeToSupabase(
          trade
        );

      if (!saved) {
        return;
      }

      trades.push(
        trade
      );

      localStorage.setItem(
        K,
        JSON.stringify(
          trades
        )
      );

      form.reset();

      if ($("date")) {

        $("date").value =
          new Date()
            .toISOString()
            .slice(0, 10);
      }

      if ($("symbol")) {

        $("symbol").value =
          "BTCUSDT";
      }

      render();

      alert(
        "Сделка сохранена в аккаунте."
      );
    };
}


/* =========================================================
   DELETE ALL
   ========================================================= */

function setupClear() {

  const button =
    $("clearAll");

  if (!button) {
    return;
  }

  button.onclick =
    async () => {

      if (!currentUser) {

        alert(
          "Сначала войди в аккаунт."
        );

        return;
      }

      if (
        !confirm(
          "Удалить всю историю твоих сделок?"
        )
      ) {

        return;
      }

      const {
        error
      } =
        await supabaseClient
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

      localStorage.setItem(
        K,
        "[]"
      );

      render();
    };
}


/* =========================================================
   EXPORT
   ========================================================= */

function setupExport() {

  const button =
    $("export");

  if (!button) {
    return;
  }

  button.onclick =
    () => {

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

        ...trades.map(
          t => [

            t.date,

            t.symbol,

            t.session,

            t.direction,

            t.result,

            t.pl,

            t.setup,

            t.entryTime ||
              "",

            t.discipline,

            t.comment ||
              ""
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
    };
}


/* =========================================================
   EVENT SETUP
   ========================================================= */

function setupEvents() {

  setupSettings();

  setupTradeForm();

  setupClear();

  setupExport();

  if ($("exportSettings")) {

    $("exportSettings")
      .onclick = () => {

        $("export")?.click();
      };
  }
}


/* =========================================================
   AUTH SESSION LISTENER
   ========================================================= */

function setupAuthListener() {

  if (
    !supabaseClient
  ) {
    return;
  }

  supabaseClient.auth
    .onAuthStateChange(
      async (
        event,
        session
      ) => {

        currentUser =
          session?.user ||
          null;

        updateAuthUI();

        if (
          event ===
            "SIGNED_IN" &&
          currentUser
        ) {

          await loadTradesFromSupabase();

          render();
        }

        if (
          event ===
            "SIGNED_OUT"
        ) {

          trades = [];

          render();
        }
      }
    );
}


/* =========================================================
   START
   ========================================================= */

(async () => {

  await init();

  setupAuthListener();

})();
```
