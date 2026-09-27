import { useState, useEffect, useCallback, useRef } from "react";

// ===== メニューデータ =====
const MENU = {
  drinks: {
    label: "🍺 ドリンク", color: "#c8a96e",
    items: [
      { id: "d1", name: "ハイボール", price: 400 },
      { id: "d2", name: "瓶ビール(アサヒ)", price: 550 },
      { id: "d3", name: "レモンサワー", price: 390 },
      { id: "d4", name: "芋焼酎", price: 500 },
      { id: "d5", name: "麦焼酎", price: 500 },
      { id: "d6", name: "日本酒", price: 500 },
      { id: "d7", name: "梅酒", price: 500 },
      { id: "d8", name: "みかん酒", price: 500 },
      { id: "d9", name: "コーラ", price: 300 },
      { id: "d10", name: "オレンジジュース", price: 300 },
      { id: "d11", name: "ウーロン茶", price: 300 },
    ],
  },
  kushimono: {
    label: "🍢 串もの", color: "#e07b4a",
    items: [
      { id: "k1", name: "ねぎま", price: 350, unit: "2本" },
      { id: "k2", name: "せせり", price: 350, unit: "2本" },
      { id: "k3", name: "こころ", price: 350, unit: "2本" },
      { id: "k4", name: "ずり", price: 350, unit: "2本" },
      { id: "k5", name: "ぼんじり", price: 350, unit: "2本" },
      { id: "k6", name: "皮", price: 350, unit: "2本" },
      { id: "k7", name: "まん丸つくね", price: 350, unit: "2本" },
      { id: "k8", name: "ねぎま(柚子胡椒)", price: 370, unit: "2本" },
      { id: "k9", name: "ねぎま(ポン酢)", price: 370, unit: "2本" },
    ],
  },
  agemono: {
    label: "🍟 揚げ物", color: "#d4a017",
    items: [
      { id: "a1", name: "ポテトフライ小", price: 350 },
      { id: "a2", name: "ポテトフライ大", price: 700 },
      { id: "a3", name: "とり皮餃子", price: 500 },
      { id: "a4", name: "串唐揚(せせり)", price: 400, unit: "2本" },
      { id: "a5", name: "串唐揚(ずり)", price: 400, unit: "2本" },
      { id: "a6", name: "串唐揚(ぼんじり)", price: 400, unit: "2本" },
      { id: "a7", name: "鶏南蛮", price: 450, unit: "2本" },
    ],
  },
  speed: {
    label: "⚡ スピード", color: "#5b8c5a",
    items: [
      { id: "s1", name: "枝豆", price: 390 },
      { id: "s2", name: "ミニ厚揚げ", price: 390 },
      { id: "s3", name: "ずりへたぽん酢", price: 390 },
    ],
  },
  ippin: {
    label: "🍳 一品", color: "#7b5ea7",
    items: [
      { id: "i1", name: "旨塩厚揚げ", price: 400 },
      { id: "i2", name: "出汁巻き玉子", price: 450 },
      { id: "i3", name: "甘辛鶏ホルモン", price: 450 },
      { id: "i4", name: "焼きそば(塩)", price: 530 },
      { id: "i5", name: "焼きそば(ソース)", price: 530 },
      { id: "i6", name: "海老マヨ", price: 550 },
      { id: "i7", name: "海老チリ", price: 550 },
      { id: "i8", name: "唐出汁巻き", price: 650 },
      { id: "i9", name: "オムそば", price: 650 },
    ],
  },
  special: {
    label: "🎉 1000べろ", color: "#c0392b",
    items: [{ id: "sp1", name: "1000べろセット", price: 1000, special: true }],
  },
};

// ===== utils =====
const fmt = n => n.toLocaleString("ja-JP") + "円";
const nowStr = () => new Date().toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
const toJST = (d = new Date()) => new Date(d.getTime() + 9 * 3600000);
const dateKey = (ts) => toJST(new Date(ts)).toISOString().slice(0, 10);
const todayKey = () => dateKey(Date.now());

// ===== Shared Storage Keys =====
const KEY_LIVE = "pos_live_state";       // 卓・セッション（リアルタイム共有）
const KEY_ORDERS = "pos_all_orders";     // 全会計済み注文ログ
const KEY_CUSTOMERS = "pos_customers";  // 顧客データ
const KEY_DAILIES = "pos_daily_reports"; // 日次サマリー

// ===== 初期state =====
function initLive() {
  return {
    tables: [
      { id: 1, name: "1卓", seats: 4 }, { id: 2, name: "2卓", seats: 4 },
      { id: 3, name: "3卓", seats: 2 }, { id: 4, name: "4卓", seats: 2 },
      { id: 5, name: "5卓", seats: 6 }, { id: 6, name: "6卓", seats: 6 },
    ],
    sessions: [],
    updatedAt: Date.now(),
  };
}

const TABS = [
  { label: "卓管理", icon: "🏮" },
  { label: "キッチン", icon: "👨‍🍳" },
  { label: "顧客", icon: "👥" },
  { label: "分析", icon: "📊" },
  { label: "データ", icon: "🗂" },
  { label: "AI戦略", icon: "💡" },
  { label: "経理", icon: "🧾" },
];

// ===== SYNC HOOK =====
// 入力ラグ対策:
//  1) ポーリングで取得した内容が前回と同じ場合はsetValを呼ばない
//     → 無駄な全体再描画（＝タイピング中のカクつき）を防ぐ
//  2) 入力欄（input/textarea/select）にフォーカスがある間はポーリング自体をスキップ
//     → 通信・再描画のタイミングでキー入力が引っかかるのを防ぐ
//  3) ローカルでの書き込み後、その書き込みより前に発行された古いポーリング結果は
//     反映しない（バージョン番号で判定）→ 入力直後に古い値へ巻き戻る現象を防ぐ
function useSharedState(key, shared = true) {
  const [val, setVal] = useState(null);
  const [ready, setReady] = useState(false);
  const versionRef = useRef(0);
  const lastRawRef = useRef(null);
  const hasLoadedRef = useRef(false);

  const load = useCallback(async () => {
    // 初回ロード以降は、フォーム入力中ならポーリングをスキップ
    if (hasLoadedRef.current) {
      const active = document.activeElement;
      const isTyping = active && ["INPUT", "TEXTAREA", "SELECT"].includes(active.tagName);
      if (isTyping) return;
    }

    const myVersion = versionRef.current;
    try {
      const r = await window.storage.get(key, shared);
      if (r && versionRef.current === myVersion && r.value !== lastRawRef.current) {
        lastRawRef.current = r.value;
        setVal(JSON.parse(r.value));
      }
    } catch { /* new key */ }
    hasLoadedRef.current = true;
    setReady(true);
  }, [key, shared]);

  useEffect(() => { load(); }, [load]);

  // Poll every 3 seconds for live sync
  useEffect(() => {
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, [load]);

  const persist = useCallback(async (next) => {
    versionRef.current += 1;
    const raw = JSON.stringify(next);
    lastRawRef.current = raw;
    setVal(next);
    try { await window.storage.set(key, raw, shared); } catch (e) { console.error(e); }
  }, [key, shared]);

  return [val, persist, ready];
}

// ===== MAIN =====
export default function App() {
  const [live, persistLive, liveReady] = useSharedState(KEY_LIVE, true);
  const [allOrders, persistOrders] = useSharedState(KEY_ORDERS, true);
  const [customers, persistCustomers] = useSharedState(KEY_CUSTOMERS, true);
  const [dailies, persistDailies] = useSharedState(KEY_DAILIES, true);

  const [tab, setTab] = useState(0);
  const [openTableId, setOpenTableId] = useState(null);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closedReport, setClosedReport] = useState(null);

  // liveが未ロードなら初期化
  const liveData = live || initLive();
  const ordersData = allOrders || [];
  const customersData = customers || [];
  const dailiesData = dailies || [];

  const getSession = (tid) => liveData.sessions.find(s => s.tableId === tid) || null;

  function openTable(tableId, customerName) {
    const tbl = liveData.tables.find(t => t.id === tableId);
    const session = {
      id: Date.now(), tableId,
      openedAt: Date.now(),
      customerName: customerName || tbl?.name || "",
      orders: [],
    };
    persistLive({ ...liveData, sessions: [...liveData.sessions, session], updatedAt: Date.now() });
  }

  async function checkout(tableId, customerName) {
    const session = getSession(tableId);
    if (!session) return;
    const total = session.orders.reduce((s, o) => s + o.price * o.qty, 0);
    const tbl = liveData.tables.find(t => t.id === tableId);
    const record = {
      id: Date.now(), ts: Date.now(), tableId,
      tableName: tbl?.name || "",
      customerName: customerName || session.customerName,
      items: session.orders, total,
      dateKey: todayKey(),
    };

    // 顧客更新
    const name = record.customerName;
    const ex = customersData.find(c => c.name === name);
    let newCustomers;
    if (ex) {
      const fav = { ...ex.favoriteItems };
      session.orders.forEach(o => { fav[o.itemName] = (fav[o.itemName] || 0) + o.qty; });
      newCustomers = customersData.map(c => c.name === name
        ? { ...c, visits: c.visits + 1, totalSpent: c.totalSpent + total, lastVisit: Date.now(), favoriteItems: fav }
        : c);
    } else {
      const fav = {};
      session.orders.forEach(o => { fav[o.itemName] = (fav[o.itemName] || 0) + o.qty; });
      newCustomers = [...customersData, { id: Date.now(), name, visits: 1, totalSpent: total, firstVisit: Date.now(), lastVisit: Date.now(), favoriteItems: fav }];
    }

    await persistOrders([record, ...ordersData]);
    await persistCustomers(newCustomers);
    await persistLive({
      ...liveData,
      sessions: liveData.sessions.filter(s => s.tableId !== tableId),
      updatedAt: Date.now(),
    });
    setOpenTableId(null);
  }

  // 営業終了処理
  async function closeDay() {
    const today = todayKey();
    const todayOrders = ordersData.filter(o => o.dateKey === today);
    const total = todayOrders.reduce((s, o) => s + o.total, 0);
    const itemSales = {};
    todayOrders.forEach(o => o.items.forEach(i => { itemSales[i.itemName] = (itemSales[i.itemName] || 0) + i.price * i.qty; }));
    const topItems = Object.entries(itemSales).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const uniqueCustomers = [...new Set(todayOrders.map(o => o.customerName))].length;

    const report = {
      id: Date.now(), date: today,
      totalRevenue: total,
      orderCount: todayOrders.length,
      customerCount: uniqueCustomers,
      avgOrder: todayOrders.length ? Math.round(total / todayOrders.length) : 0,
      topItems,
      closedAt: Date.now(),
      openSessionsForced: liveData.sessions.length,
    };

    // セッションのみリセット（注文ログは保持）
    await persistLive({ ...liveData, sessions: [], updatedAt: Date.now() });
    await persistDailies([report, ...dailiesData.filter(d => d.date !== today)]);
    setClosedReport(report);
    setShowCloseModal(false);
  }

  if (!liveReady) {
    return (
      <div style={{ ...S.root, display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <div style={{ textAlign: "center", color: "#c8a96e" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🏮</div>
          <div>読み込み中...</div>
        </div>
      </div>
    );
  }

  if (closedReport) {
    return <CloseDayReport report={closedReport} onClose={() => setClosedReport(null)} />;
  }

  if (openTableId !== null) {
    return (
      <OrderScreen
        tableId={openTableId}
        session={getSession(openTableId)}
        table={liveData.tables.find(t => t.id === openTableId)}
        liveData={liveData}
        persistLive={persistLive}
        onBack={() => setOpenTableId(null)}
        onCheckout={checkout}
        openTable={openTable}
      />
    );
  }

  const lastSync = liveData.updatedAt ? new Date(liveData.updatedAt).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "-";

  return (
    <div style={S.root}>
      <header style={S.header}>
        <span style={S.logo}>𝄪 露店居酒屋 POS</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 9, color: "#5b8c5a" }}>🔄 {lastSync}</span>
          <button style={S.closeBtn} onClick={() => setShowCloseModal(true)}>🏁 営業終了</button>
        </div>
      </header>
      <nav style={S.nav}>
        {TABS.map((t, i) => (
          <button key={i} style={{ ...S.navBtn, ...(tab === i ? S.navActive : {}) }} onClick={() => setTab(i)}>
            <span style={{ fontSize: 18 }}>{t.icon}</span>
            <span style={{ fontSize: 10 }}>{t.label}</span>
          </button>
        ))}
      </nav>
      <main style={{ padding: 12 }}>
        {tab === 0 && <TableView liveData={liveData} persistLive={persistLive} ordersData={ordersData} onSelectTable={setOpenTableId} openTable={openTable} getSession={getSession} />}
        {tab === 1 && <KitchenView liveData={liveData} persistLive={persistLive} />}
        {tab === 2 && <CustomerTab customers={customersData} />}
        {tab === 3 && <AnalyticsTab ordersData={ordersData} dailiesData={dailiesData} />}
        {tab === 4 && <DataTab ordersData={ordersData} dailiesData={dailiesData} />}
        {tab === 5 && <AIStrategyTab ordersData={ordersData} dailiesData={dailiesData} customers={customersData} />}
        {tab === 6 && <AccountingTab ordersData={ordersData} />}
      </main>

      {/* 営業終了確認 */}
      {showCloseModal && (
        <div style={S.overlay} onClick={() => setShowCloseModal(false)}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 36, textAlign: "center", marginBottom: 8 }}>🏁</div>
            <div style={S.modalTitle}>営業終了しますか？</div>
            <div style={{ fontSize: 12, color: "#888", marginBottom: 14, lineHeight: 1.7 }}>
              ・本日の売上サマリーを保存します<br />
              ・全卓のセッションがリセットされます<br />
              {liveData.sessions.length > 0 && <span style={{ color: "#e07b4a" }}>⚠ 現在{liveData.sessions.length}卓が開席中です</span>}
            </div>
            <div style={S.modalBtns}>
              <button style={S.btnGray} onClick={() => setShowCloseModal(false)}>キャンセル</button>
              <button style={{ ...S.btnGold, background: "linear-gradient(135deg,#c0392b,#922b21)" }} onClick={closeDay}>終了する</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================
// 営業終了レポート画面
// =============================================
function CloseDayReport({ report, onClose }) {
  return (
    <div style={S.root}>
      <div style={{ padding: 20, textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>🏁</div>
        <div style={{ fontSize: 22, fontWeight: "bold", color: "#c8a96e", marginBottom: 4 }}>営業終了</div>
        <div style={{ fontSize: 13, color: "#888", marginBottom: 20 }}>{report.date} の集計</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
          {[
            { label: "本日売上", value: fmt(report.totalRevenue), big: true },
            { label: "注文件数", value: `${report.orderCount}件` },
            { label: "来客数", value: `${report.customerCount}組` },
            { label: "客単価", value: fmt(report.avgOrder) },
          ].map(({ label, value, big }) => (
            <div key={label} style={{ background: "#1a1208", border: "1px solid #2a2010", borderRadius: 12, padding: 14 }}>
              <div style={{ fontSize: big ? 22 : 18, fontWeight: "bold", color: "#c8a96e" }}>{value}</div>
              <div style={{ fontSize: 11, color: "#888", marginTop: 3 }}>{label}</div>
            </div>
          ))}
        </div>
        <div style={{ background: "#1a1208", border: "1px solid #2a2010", borderRadius: 12, padding: 14, marginBottom: 16, textAlign: "left" }}>
          <div style={{ fontSize: 13, fontWeight: "bold", color: "#c8a96e", marginBottom: 8 }}>🏆 本日の売れ筋TOP5</div>
          {report.topItems.length === 0 && <div style={{ color: "#555", fontSize: 12 }}>データなし</div>}
          {report.topItems.map(([name, val], i) => (
            <div key={name} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
              <span><span style={{ color: i < 3 ? "#c8a96e" : "#555", marginRight: 6 }}>#{i + 1}</span>{name}</span>
              <span style={{ color: "#c8a96e" }}>{fmt(val)}</span>
            </div>
          ))}
        </div>
        {report.openSessionsForced > 0 && (
          <div style={{ fontSize: 12, color: "#e07b4a", marginBottom: 12 }}>※ {report.openSessionsForced}卓の未会計セッションを強制終了しました</div>
        )}
        <div style={{ fontSize: 12, color: "#555", marginBottom: 16 }}>データは自動保存されました ✅</div>
        <button style={S.btnGold} onClick={onClose}>閉じる</button>
      </div>
    </div>
  );
}

// =============================================
// 卓管理
// =============================================
function TableView({ liveData, persistLive, ordersData, onSelectTable, openTable, getSession }) {
  const [addModal, setAddModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSeats, setNewSeats] = useState("4");
  const [openModal, setOpenModal] = useState(null);
  const [customerName, setCustomerName] = useState("");

  const totalRevToday = ordersData.filter(o => o.dateKey === todayKey()).reduce((s, o) => s + o.total, 0);

  function statusBadge(t) {
    const s = getSession(t.id);
    if (!s) return { label: "空席", color: "#555" };
    const pending = s.orders.filter(o => o.status !== "served").length;
    const total = s.orders.reduce((sum, o) => sum + o.price * o.qty, 0);
    if (pending > 0) return { label: `未提供 ${pending}件`, color: "#e07b4a" };
    return { label: fmt(total), color: "#5b8c5a" };
  }

  return (
    <div>
      <div style={S.statRow}>
        <div style={S.statCard}><div style={S.statNum}>{liveData.sessions.length}卓</div><div style={S.statLabel}>使用中</div></div>
        <div style={S.statCard}><div style={S.statNum}>{liveData.tables.length - liveData.sessions.length}卓</div><div style={S.statLabel}>空席</div></div>
        <div style={S.statCard}><div style={S.statNum}>{fmt(totalRevToday)}</div><div style={S.statLabel}>本日売上</div></div>
      </div>
      <div style={S.tableGrid}>
        {liveData.tables.map(t => {
          const s = getSession(t.id);
          const badge = statusBadge(t);
          const elapsed = s ? Math.floor((Date.now() - s.openedAt) / 60000) : 0;
          return (
            <div key={t.id} style={{ ...S.tableCard, background: s ? "#1f1608" : "#1a1208", borderColor: s ? badge.color : "#2a2010" }}
              onClick={() => s ? onSelectTable(t.id) : (setOpenModal(t.id), setCustomerName(""))}>
              <div style={S.tableCardTop}>
                <span style={S.tableName}>{t.name}</span>
                <span style={{ ...S.tableBadge, background: badge.color === "#555" ? "#222" : badge.color + "33", color: badge.color, border: `1px solid ${badge.color}` }}>{badge.label}</span>
              </div>
              <div style={S.tableSeats}>👤 {t.seats}席</div>
              {s && <div style={S.tableElapsed}>⏱ {elapsed}分</div>}
              {s && <div style={S.tableCustomer}>🙍 {s.customerName}</div>}
              {!s && <div style={{ fontSize: 11, color: "#444", marginTop: 4 }}>タップして開席</div>}
            </div>
          );
        })}
        <button style={S.addTableBtn} onClick={() => setAddModal(true)}>＋ 卓を追加</button>
      </div>

      {openModal && (
        <div style={S.overlay} onClick={() => setOpenModal(null)}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <div style={S.modalTitle}>🏮 {liveData.tables.find(t => t.id === openModal)?.name} 開席</div>
            <input style={S.input} placeholder="お客様名（省略可）" value={customerName} onChange={e => setCustomerName(e.target.value)} autoFocus />
            <div style={S.modalBtns}>
              <button style={S.btnGray} onClick={() => setOpenModal(null)}>キャンセル</button>
              <button style={S.btnGold} onClick={() => { openTable(openModal, customerName); setOpenModal(null); onSelectTable(openModal); }}>開席 → 注文入力</button>
            </div>
          </div>
        </div>
      )}

      {addModal && (
        <div style={S.overlay} onClick={() => setAddModal(false)}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <div style={S.modalTitle}>➕ 卓を追加</div>
            <input style={S.input} placeholder="卓名" value={newName} onChange={e => setNewName(e.target.value)} />
            <input style={{ ...S.input, marginTop: 8 }} type="number" placeholder="席数" value={newSeats} onChange={e => setNewSeats(e.target.value)} />
            <div style={S.modalBtns}>
              <button style={S.btnGray} onClick={() => setAddModal(false)}>キャンセル</button>
              <button style={S.btnGold} onClick={() => {
                const t = { id: Date.now(), name: newName || `${liveData.tables.length + 1}卓`, seats: parseInt(newSeats) || 4 };
                persistLive({ ...liveData, tables: [...liveData.tables, t], updatedAt: Date.now() });
                setAddModal(false); setNewName(""); setNewSeats("4");
              }}>追加</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================
// 注文入力スクリーン
// =============================================
function OrderScreen({ tableId, session, table, liveData, persistLive, onBack, onCheckout, openTable }) {
  const [activeCat, setActiveCat] = useState("drinks");
  const [cart, setCart] = useState([]);
  const [noteInput, setNoteInput] = useState("");
  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutName, setCheckoutName] = useState(session?.customerName || "");
  const [view, setView] = useState("menu");

  if (!session) return (
    <div style={S.root}>
      <div style={{ padding: 20, textAlign: "center", color: "#555" }}>セッションが見つかりません</div>
      <button style={{ ...S.btnGold, margin: "0 20px" }} onClick={onBack}>戻る</button>
    </div>
  );

  const sessionTotal = session.orders.reduce((s, o) => s + o.price * o.qty, 0);
  const cartTotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const pendingCount = session.orders.filter(o => o.status !== "served").length;

  function addToCart(item) {
    setCart(prev => {
      const ex = prev.find(x => x.id === item.id);
      return ex ? prev.map(x => x.id === item.id ? { ...x, qty: x.qty + 1 } : x)
                : [...prev, { ...item, qty: 1 }];
    });
  }

  function changeQty(id, d) {
    setCart(prev => prev.flatMap(x => {
      if (x.id !== id) return [x];
      const nq = x.qty + d;
      return nq <= 0 ? [] : [{ ...x, qty: nq }];
    }));
  }

  function sendOrder() {
    if (cart.length === 0) return;
    const newOrders = cart.map(item => ({
      id: Date.now() + Math.random(),
      itemId: item.id, itemName: item.name, price: item.price, qty: item.qty,
      note: noteInput, status: "ordered",
      orderedAt: Date.now(), orderedAtStr: nowStr(),
    }));
    persistLive({
      ...liveData,
      sessions: liveData.sessions.map(s => s.tableId === tableId
        ? { ...s, orders: [...s.orders, ...newOrders] } : s),
      updatedAt: Date.now(),
    });
    setCart([]); setNoteInput(""); setView("history");
  }

  function markStatus(orderId, status) {
    persistLive({
      ...liveData,
      sessions: liveData.sessions.map(s => s.tableId === tableId
        ? { ...s, orders: s.orders.map(o => o.id === orderId ? { ...o, status } : o) } : s),
      updatedAt: Date.now(),
    });
  }

  function cancelItem(orderId) {
    persistLive({
      ...liveData,
      sessions: liveData.sessions.map(s => s.tableId === tableId
        ? { ...s, orders: s.orders.filter(o => o.id !== orderId) } : s),
      updatedAt: Date.now(),
    });
  }

  const statusStyle = (st) => ({
    served:  { background: "#0d1a0d", color: "#5b8c5a", border: "1px solid #5b8c5a" },
    cooking: { background: "#1a1208", color: "#e07b4a", border: "1px solid #e07b4a" },
    ordered: { background: "#1a0d0d", color: "#c0392b", border: "1px solid #c0392b" },
  })[st] || {};

  return (
    <div style={S.root}>
      <div style={S.orderHeader}>
        <button style={S.backBtn} onClick={onBack}>← 卓一覧</button>
        <div style={{ textAlign: "center" }}>
          <div style={{ color: "#c8a96e", fontWeight: "bold", fontSize: 16 }}>{table?.name}</div>
          <div style={{ fontSize: 11, color: "#888" }}>👤 {session.customerName}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ color: "#c8a96e", fontWeight: "bold" }}>{fmt(sessionTotal)}</div>
          {pendingCount > 0 && <div style={{ fontSize: 10, color: "#e07b4a" }}>未提供{pendingCount}件</div>}
        </div>
      </div>

      <div style={S.subTabBar}>
        <button style={{ ...S.subTab, ...(view === "menu" ? S.subTabActive : {}) }} onClick={() => setView("menu")}>
          🍽 注文追加 {cart.length > 0 && <span style={S.cartCount}>{cart.reduce((s,i)=>s+i.qty,0)}</span>}
        </button>
        <button style={{ ...S.subTab, ...(view === "history" ? S.subTabActive : {}) }} onClick={() => setView("history")}>
          📋 注文履歴 {pendingCount > 0 && <span style={{ ...S.cartCount, background: "#e07b4a" }}>{pendingCount}</span>}
        </button>
      </div>

      {view === "menu" && (
        <div>
          <div style={S.catBar}>
            {Object.entries(MENU).map(([key, cat]) => (
              <button key={key} style={{ ...S.catBtn, ...(activeCat === key ? { background: cat.color, color: "#fff", borderColor: cat.color } : {}) }}
                onClick={() => setActiveCat(key)}>{cat.label}</button>
            ))}
          </div>
          <div style={S.menuGrid}>
            {MENU[activeCat].items.map(item => {
              const inCart = cart.find(x => x.id === item.id);
              return (
                <button key={item.id} style={{ ...S.menuItem, ...(inCart ? { borderColor: MENU[activeCat].color, background: "#2a1f0d" } : {}) }}
                  onClick={() => addToCart(item)}>
                  {inCart && <span style={S.badge}>{inCart.qty}</span>}
                  <span style={S.menuName}>{item.name}</span>
                  {item.unit && <span style={S.menuUnit}>{item.unit}</span>}
                  <span style={{ ...S.menuPrice, color: MENU[activeCat].color }}>{fmt(item.price)}</span>
                </button>
              );
            })}
          </div>
          {cart.length > 0 && (
            <div style={S.cartBox}>
              <div style={S.cartTitle}>🛒 追加注文</div>
              {cart.map(item => (
                <div key={item.id} style={S.cartRow}>
                  <span style={S.cartName}>{item.name}</span>
                  <div style={S.qtyRow}>
                    <button style={S.qBtn} onClick={() => changeQty(item.id, -1)}>－</button>
                    <span style={S.qNum}>{item.qty}</span>
                    <button style={S.qBtn} onClick={() => changeQty(item.id, +1)}>＋</button>
                  </div>
                  <span style={S.cartPrice}>{fmt(item.price * item.qty)}</span>
                </div>
              ))}
              <input style={{ ...S.input, marginTop: 8, fontSize: 12 }} placeholder="メモ（アレルギー・味付け等）" value={noteInput} onChange={e => setNoteInput(e.target.value)} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "8px 0" }}>
                <span style={{ color: "#888", fontSize: 13 }}>小計</span>
                <span style={{ color: "#c8a96e", fontWeight: "bold", fontSize: 18 }}>{fmt(cartTotal)}</span>
              </div>
              <button style={S.btnGold} onClick={sendOrder}>📩 注文を送信する</button>
            </div>
          )}
        </div>
      )}

      {view === "history" && (
        <div style={{ padding: "0 12px" }}>
          {session.orders.length === 0 && <div style={{ textAlign: "center", color: "#555", padding: 30 }}>まだ注文がありません</div>}
          {session.orders.filter(o => o.status !== "served").length > 0 && (
            <div>
              <div style={S.histSection}>⏳ 未提供 / 調理中</div>
              {session.orders.filter(o => o.status !== "served").map(o => (
                <div key={o.id} style={{ ...S.orderRow, ...statusStyle(o.status) }}>
                  <div style={S.orderRowTop}>
                    <span style={S.orderItemName}>{o.itemName}</span>
                    <span style={S.orderItemQty}>×{o.qty}</span>
                    <span style={S.orderItemPrice}>{fmt(o.price * o.qty)}</span>
                  </div>
                  {o.note && <div style={S.orderNote}>📝 {o.note}</div>}
                  <div style={S.orderMeta}>{o.orderedAtStr} に注文</div>
                  <div style={S.orderActions}>
                    {o.status === "ordered" && <button style={S.actionBtn} onClick={() => markStatus(o.id, "cooking")}>🔥 調理中</button>}
                    <button style={{ ...S.actionBtn, background: "#0d1a0d", borderColor: "#5b8c5a", color: "#5b8c5a" }} onClick={() => markStatus(o.id, "served")}>✅ 提供済</button>
                    <button style={{ ...S.actionBtn, background: "#1a0a0a", borderColor: "#555", color: "#555" }} onClick={() => cancelItem(o.id)}>✕ 取消</button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {session.orders.filter(o => o.status === "served").length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={S.histSection}>✅ 提供済み</div>
              {session.orders.filter(o => o.status === "served").map(o => (
                <div key={o.id} style={{ ...S.orderRow, opacity: 0.6, ...statusStyle("served") }}>
                  <div style={S.orderRowTop}>
                    <span style={S.orderItemName}>{o.itemName}</span>
                    <span style={S.orderItemQty}>×{o.qty}</span>
                    <span style={S.orderItemPrice}>{fmt(o.price * o.qty)}</span>
                  </div>
                  {o.note && <div style={S.orderNote}>📝 {o.note}</div>}
                  <div style={S.orderMeta}>{o.orderedAtStr} に注文</div>
                </div>
              ))}
            </div>
          )}
          {session.orders.length > 0 && (
            <div style={{ marginTop: 14, background: "#1a1208", border: "1px solid #2a2010", borderRadius: 12, padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ color: "#888" }}>合計</span>
                <span style={{ color: "#c8a96e", fontWeight: "bold", fontSize: 22 }}>{fmt(sessionTotal)}</span>
              </div>
              {pendingCount > 0 && <div style={{ fontSize: 12, color: "#e07b4a", marginBottom: 8 }}>⚠ 未提供{pendingCount}件あり</div>}
              <button style={{ ...S.btnGold, background: "linear-gradient(135deg,#c8a96e,#a0793a)" }} onClick={() => setShowCheckout(true)}>💴 会計する</button>
            </div>
          )}
        </div>
      )}

      {showCheckout && (
        <div style={S.overlay} onClick={() => setShowCheckout(false)}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <div style={S.modalTitle}>💴 会計確認</div>
            {session.orders.map(o => (
              <div key={o.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                <span>{o.itemName} ×{o.qty}</span><span>{fmt(o.price * o.qty)}</span>
              </div>
            ))}
            <div style={{ borderTop: "1px dashed #3a2e18", margin: "10px 0" }} />
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <span>合計</span>
              <span style={{ color: "#c8a96e", fontWeight: "bold", fontSize: 22 }}>{fmt(sessionTotal)}</span>
            </div>
            <input style={S.input} placeholder="お客様名（省略可）" value={checkoutName} onChange={e => setCheckoutName(e.target.value)} />
            <div style={S.modalBtns}>
              <button style={S.btnGray} onClick={() => setShowCheckout(false)}>戻る</button>
              <button style={S.btnGold} onClick={() => { onCheckout(tableId, checkoutName); setShowCheckout(false); }}>会計完了</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================
// キッチンビュー
// =============================================
function KitchenView({ liveData, persistLive }) {
  const allPending = liveData.sessions.flatMap(s => {
    const table = liveData.tables.find(t => t.id === s.tableId);
    return s.orders.filter(o => o.status !== "served")
      .map(o => ({ ...o, tableName: table?.name || "不明", tableId: s.tableId }));
  }).sort((a, b) => a.orderedAt - b.orderedAt);

  function markStatus(tableId, orderId, status) {
    persistLive({
      ...liveData,
      sessions: liveData.sessions.map(s => s.tableId === tableId
        ? { ...s, orders: s.orders.map(o => o.id === orderId ? { ...o, status } : o) } : s),
      updatedAt: Date.now(),
    });
  }

  return (
    <div>
      <div style={{ fontWeight: "bold", color: "#c8a96e", fontSize: 15, marginBottom: 12 }}>
        👨‍🍳 キッチン — 未提供 {allPending.length}件
      </div>
      {allPending.length === 0 && <div style={{ textAlign: "center", color: "#555", padding: 40 }}>未提供の注文なし 🎉</div>}
      {allPending.map(o => {
        const elapsed = Math.floor((Date.now() - o.orderedAt) / 60000);
        const urgent = elapsed >= 10;
        return (
          <div key={o.id} style={{ ...S.kitchenCard, borderColor: o.status === "cooking" ? "#e07b4a" : urgent ? "#c0392b" : "#2a2010", background: o.status === "cooking" ? "#2d1a08" : urgent ? "#1a0808" : "#1a1208" }}>
            <div style={S.kitchenTop}>
              <span style={{ ...S.kitchenTable, color: o.status === "cooking" ? "#e07b4a" : "#c8a96e" }}>{o.tableName}</span>
              <span style={S.kitchenTime}>{o.orderedAtStr}（{elapsed}分前{urgent ? " ⚠" : ""}）</span>
            </div>
            <div style={S.kitchenItemName}>{o.itemName} <span style={{ color: "#888" }}>×{o.qty}</span></div>
            {o.note && <div style={S.orderNote}>📝 {o.note}</div>}
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              {o.status === "ordered" && <button style={{ ...S.actionBtn, flex: 1 }} onClick={() => markStatus(o.tableId, o.id, "cooking")}>🔥 調理中</button>}
              <button style={{ ...S.actionBtn, flex: 1, background: "#0d1a0d", borderColor: "#5b8c5a", color: "#5b8c5a" }} onClick={() => markStatus(o.tableId, o.id, "served")}>✅ 提供済</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// =============================================
// 顧客タブ
// =============================================
function CustomerTab({ customers }) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const sorted = [...customers].filter(c => c.name.includes(search)).sort((a, b) => b.totalSpent - a.totalSpent);
  function rank(c) {
    if (c.visits >= 10 || c.totalSpent >= 10000) return { label: "常連", color: "#c8a96e" };
    if (c.visits >= 5  || c.totalSpent >= 5000)  return { label: "リピーター", color: "#7b5ea7" };
    return { label: "新規", color: "#5b8c5a" };
  }
  return (
    <div>
      <input style={S.input} placeholder="🔍 名前で検索" value={search} onChange={e => setSearch(e.target.value)} />
      <div style={{ ...S.statRow, marginTop: 10 }}>
        <div style={S.statCard}><div style={S.statNum}>{customers.length}</div><div style={S.statLabel}>総顧客数</div></div>
        <div style={S.statCard}><div style={S.statNum}>{customers.filter(c => rank(c).label === "常連").length}</div><div style={S.statLabel}>常連</div></div>
        <div style={S.statCard}><div style={S.statNum}>{customers.filter(c => Date.now() - c.lastVisit < 7 * 86400000).length}</div><div style={S.statLabel}>今週来店</div></div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
        {sorted.map(c => {
          const r = rank(c);
          const fav = Object.entries(c.favoriteItems || {}).sort((a, b) => b[1] - a[1])[0];
          const isSel = selected?.id === c.id;
          return (
            <div key={c.id} style={{ ...S.customerCard, ...(isSel ? { borderColor: "#c8a96e" } : {}) }} onClick={() => setSelected(isSel ? null : c)}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div><span style={{ fontWeight: "bold", fontSize: 15 }}>{c.name}</span><span style={{ ...S.rankBadge, background: r.color }}>{r.label}</span></div>
                <span style={{ color: "#c8a96e", fontWeight: "bold" }}>{fmt(c.totalSpent)}</span>
              </div>
              <div style={{ fontSize: 11, color: "#888", marginTop: 3, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <span>{c.visits}回来店</span>
                {fav && <span>よく頼む: {fav[0]}</span>}
                <span>最終: {new Date(c.lastVisit).toLocaleDateString("ja-JP")}</span>
              </div>
              {isSel && (
                <div style={{ marginTop: 10, borderTop: "1px solid #2a2010", paddingTop: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: "bold", color: "#c8a96e", marginBottom: 6 }}>🍴 よく頼むメニュー</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {Object.entries(c.favoriteItems || {}).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([n, cnt]) => (
                      <span key={n} style={{ background: "#2a1f0d", border: "1px solid #3a2e18", borderRadius: 10, padding: "2px 8px", fontSize: 11, color: "#c8a96e" }}>{n}({cnt})</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {sorted.length === 0 && <div style={{ textAlign: "center", color: "#555", padding: 30 }}>顧客データなし</div>}
      </div>
    </div>
  );
}

// =============================================
// 分析タブ
// =============================================
function AnalyticsTab({ ordersData, dailiesData }) {
  const total = ordersData.reduce((s, o) => s + o.total, 0);
  const avg = ordersData.length ? Math.round(total / ordersData.length) : 0;

  const days = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    days[toJST(d).toISOString().slice(0, 10)] = 0;
  }
  ordersData.forEach(o => { if (o.dateKey in days) days[o.dateKey] += o.total; });

  const itemSales = {};
  ordersData.forEach(o => o.items.forEach(i => { itemSales[i.itemName] = (itemSales[i.itemName] || 0) + i.price * i.qty; }));
  const topItems = Object.entries(itemSales).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const maxDay = Math.max(...Object.values(days), 1);
  const maxItem = Math.max(...topItems.map(x => x[1]), 1);

  return (
    <div>
      <div style={S.statRow}>
        <div style={S.statCard}><div style={S.statNum}>{fmt(total)}</div><div style={S.statLabel}>累計売上</div></div>
        <div style={S.statCard}><div style={S.statNum}>{ordersData.length}件</div><div style={S.statLabel}>累計注文</div></div>
        <div style={S.statCard}><div style={S.statNum}>{fmt(avg)}</div><div style={S.statLabel}>客単価</div></div>
      </div>

      <div style={S.chartCard}>
        <div style={S.chartTitle}>📅 日別売上（直近7日）</div>
        <div style={{ display: "flex", gap: 4, alignItems: "flex-end", height: 90 }}>
          {Object.entries(days).map(([k, v]) => (
            <div key={k} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
              <div style={{ fontSize: 7, color: "#888" }}>{v > 0 ? fmt(v) : ""}</div>
              <div style={{ width: "100%", background: "#2a2010", borderRadius: 3, flex: 1, display: "flex", alignItems: "flex-end" }}>
                <div style={{ width: "100%", borderRadius: 3, height: `${(v / maxDay) * 100}%`, background: "#c8a96e", minHeight: v > 0 ? 3 : 0 }} />
              </div>
              <div style={{ fontSize: 8, color: "#666" }}>{k.slice(5)}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={S.chartCard}>
        <div style={S.chartTitle}>🏆 売れ筋ランキング（累計）</div>
        {topItems.length === 0 && <div style={{ color: "#555", fontSize: 12, textAlign: "center", padding: 10 }}>データなし</div>}
        {topItems.map(([name, v], i) => (
          <div key={name} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: "bold", color: i < 3 ? "#c8a96e" : "#555", minWidth: 24 }}>#{i + 1}</span>
            <span style={{ fontSize: 12, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
            <div style={{ width: 80, height: 8, background: "#2a2010", borderRadius: 4, overflow: "hidden" }}>
              <div style={{ height: "100%", background: "#c8a96e", borderRadius: 4, width: `${(v / maxItem) * 100}%` }} />
            </div>
            <span style={{ fontSize: 11, color: "#c8a96e", minWidth: 58, textAlign: "right" }}>{fmt(v)}</span>
          </div>
        ))}
      </div>

      {dailiesData.length > 0 && (
        <div style={S.chartCard}>
          <div style={S.chartTitle}>📆 日次サマリー履歴</div>
          {dailiesData.slice(0, 10).map(d => (
            <div key={d.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid #1a1208", fontSize: 13 }}>
              <span style={{ color: "#888" }}>{d.date}</span>
              <div style={{ textAlign: "right" }}>
                <div style={{ color: "#c8a96e", fontWeight: "bold" }}>{fmt(d.totalRevenue)}</div>
                <div style={{ fontSize: 10, color: "#666" }}>{d.orderCount}件 / {d.customerCount}組</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================
// データ管理タブ
// =============================================
function DataTab({ ordersData, dailiesData }) {
  const [filterDate, setFilterDate] = useState("");
  const [filterItem, setFilterItem] = useState("");
  const [expandId, setExpandId] = useState(null);
  const [subTab, setSubTab] = useState("orders"); // orders | daily

  const filtered = ordersData.filter(o => {
    if (filterDate && o.dateKey !== filterDate) return false;
    if (filterItem && !o.items.some(i => i.itemName.includes(filterItem))) return false;
    return true;
  });

  // CSV export
  function exportCSV() {
    const rows = [["日付", "時刻", "卓名", "顧客名", "合計", "注文内容"]];
    filtered.forEach(o => {
      const t = new Date(o.ts).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
      const items = o.items.map(i => `${i.itemName}×${i.qty}`).join(" / ");
      rows.push([o.dateKey, t, o.tableName, o.customerName, o.total, items]);
    });
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `izakaya_log_${filterDate || "all"}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  const totalFiltered = filtered.reduce((s, o) => s + o.total, 0);

  return (
    <div>
      <div style={{ display: "flex", background: "#110e07", borderBottom: "1px solid #2a2010", marginBottom: 10 }}>
        {[["orders","📋 注文ログ"],["daily","📆 日次レポート"]].map(([v,l]) => (
          <button key={v} style={{ flex: 1, padding: "10px", background: "transparent", border: "none", color: subTab === v ? "#c8a96e" : "#555", fontSize: 13, cursor: "pointer", borderBottom: `2px solid ${subTab === v ? "#c8a96e" : "transparent"}` }}
            onClick={() => setSubTab(v)}>{l}</button>
        ))}
      </div>

      {subTab === "orders" && (
        <div>
          {/* フィルター */}
          <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
            <input type="date" style={{ ...S.input, flex: 1, fontSize: 12 }} value={filterDate} onChange={e => setFilterDate(e.target.value)} />
            <input style={{ ...S.input, flex: 1, fontSize: 12 }} placeholder="メニュー絞込" value={filterItem} onChange={e => setFilterItem(e.target.value)} />
          </div>

          <div style={{ ...S.statRow, marginBottom: 10 }}>
            <div style={S.statCard}><div style={S.statNum}>{filtered.length}件</div><div style={S.statLabel}>件数</div></div>
            <div style={S.statCard}><div style={S.statNum}>{fmt(totalFiltered)}</div><div style={S.statLabel}>合計</div></div>
            <button style={{ ...S.btnGold, fontSize: 11, padding: "6px 10px", flex: 1 }} onClick={exportCSV}>📥 CSV</button>
          </div>

          {/* 注文ログ */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {filtered.length === 0 && <div style={{ textAlign: "center", color: "#555", padding: 30 }}>データなし</div>}
            {filtered.map(o => {
              const time = new Date(o.ts).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
              const isExp = expandId === o.id;
              return (
                <div key={o.id} style={{ background: "#1a1208", border: "1px solid #2a2010", borderRadius: 10, padding: "10px 12px", cursor: "pointer" }}
                  onClick={() => setExpandId(isExp ? null : o.id)}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <span style={{ fontSize: 12, color: "#888" }}>{o.dateKey} {time}</span>
                      <span style={{ fontSize: 12, color: "#c8a96e", marginLeft: 8 }}>{o.tableName}</span>
                      {o.customerName && o.customerName !== o.tableName && <span style={{ fontSize: 11, color: "#888", marginLeft: 6 }}>🙍 {o.customerName}</span>}
                    </div>
                    <span style={{ color: "#c8a96e", fontWeight: "bold", fontSize: 15 }}>{fmt(o.total)}</span>
                  </div>
                  {!isExp && (
                    <div style={{ fontSize: 11, color: "#666", marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {o.items.map(i => `${i.itemName}×${i.qty}`).join(" / ")}
                    </div>
                  )}
                  {isExp && (
                    <div style={{ marginTop: 10, borderTop: "1px solid #2a2010", paddingTop: 8 }}>
                      {o.items.map((i, idx) => (
                        <div key={idx} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                          <span>{i.itemName} ×{i.qty}{i.note ? <span style={{ color: "#666", fontSize: 11 }}> ({i.note})</span> : ""}</span>
                          <span style={{ color: "#c8a96e" }}>{fmt(i.price * i.qty)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {subTab === "daily" && (
        <div>
          {dailiesData.length === 0 && <div style={{ textAlign: "center", color: "#555", padding: 40 }}>まだ営業終了記録がありません</div>}
          {dailiesData.map(d => (
            <div key={d.id} style={{ background: "#1a1208", border: "1px solid #2a2010", borderRadius: 12, padding: 14, marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontWeight: "bold", color: "#c8a96e", fontSize: 15 }}>{d.date}</span>
                <span style={{ fontSize: 11, color: "#888" }}>締め: {new Date(d.closedAt).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6, marginBottom: 8 }}>
                {[
                  { l: "売上", v: fmt(d.totalRevenue) },
                  { l: "注文数", v: `${d.orderCount}件` },
                  { l: "来客数", v: `${d.customerCount}組` },
                  { l: "客単価", v: fmt(d.avgOrder) },
                ].map(({ l, v }) => (
                  <div key={l} style={{ background: "#110e07", borderRadius: 6, padding: "6px 4px", textAlign: "center" }}>
                    <div style={{ fontSize: 12, fontWeight: "bold", color: "#c8a96e" }}>{v}</div>
                    <div style={{ fontSize: 9, color: "#666" }}>{l}</div>
                  </div>
                ))}
              </div>
              {d.topItems.length > 0 && (
                <div style={{ fontSize: 11, color: "#888" }}>
                  🏆 {d.topItems.slice(0, 3).map(([n]) => n).join(" / ")}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================
// 領収書スキャナー（かざすだけ自動読み取り版）
// カメラ映像を常時表示し、手ブレが収まった瞬間に自動で1枚だけ撮影→AI読み取り
// →ボタンタップ無しで入力欄（日付・金額・内容・勘定科目）へ自動反映する。
// 反映後の最終保存（💾経費を登録する）だけは、誤登録防止のため引き続き手動。
// =============================================

const RECEIPT_PROMPT = `この領収書・レシートを読み取り、以下のJSON形式のみで返してください。説明文は不要です。

{
  "date": "YYYY-MM-DD形式の日付（不明なら今日）",
  "name": "店名または購入内容の要約（20文字以内）",
  "amount": 合計金額の数値（税込、円記号なし）,
  "category": "以下から最適なもの1つ: food / labor / rent / util / misc / equip / promo / trans / comm / insure / tax / other",
  "memo": "品目の簡単なメモ（30文字以内、不明なら空文字）",
  "confidence": "high / medium / low"
}

カテゴリの判断基準:
- food: 食材・飲料・酒類・業務スーパー・魚屋・肉屋など
- misc: 割り箸・消耗品・洗剤・ゴミ袋・文具など
- util: 電気・ガス・水道
- trans: 電車・バス・タクシー・駐車場
- equip: 調理器具・厨房用品・備品
- promo: チラシ・広告・SNS広告
- comm: 電話・インターネット
- labor: 給与・バイト代
- other: 上記に当てはまらない場合`;

function ReceiptScanner({ onParsed }) {
  // idle(未起動) | camera(かざして待機中) | scanning(AI読み取り中) | done(結果表示) | error
  const [mode, setMode]           = useState("idle");
  const [preview, setPreview]     = useState(null);
  const [result,  setResult]      = useState(null);
  const [errorInfo, setErrorInfo] = useState(null); // { kind, message }
  const [hint, setHint]           = useState("");

  const videoRef        = useRef(null);
  const streamRef        = useRef(null);
  const analyzeCanvasRef = useRef(null); // 手ブレ検知用（縮小画像）
  const captureCanvasRef = useRef(null); // 実際の撮影用（フル解像度）
  const fileRef          = useRef(null);
  const prevFrameRef     = useRef(null);
  const stableCountRef   = useRef(0);
  const armedAtRef       = useRef(0);    // カメラ起動/再開した時刻（起動直後の誤検知防止）
  const lockedRef        = useRef(false); // true の間は手ブレ検知を一時停止（AI読み取り中など）
  const rafRef           = useRef(null);

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // レスポンスの中身からエラー種別を判定
  function classifyError(httpStatus, body) {
    const type = body?.error?.type || body?.type || "";
    if (httpStatus === 429 || type === "rate_limit_error") {
      return { kind: "rate_limit", message: "リクエストが混み合っています。少し時間をおいてから、もう一度お試しください。" };
    }
    if (httpStatus === 401 || httpStatus === 403 || type === "authentication_error" || type === "permission_error") {
      return { kind: "auth", message: "AIサービスの認証設定に問題があります。管理者にAPIキーの設定をご確認いただいてください。" };
    }
    if (httpStatus === 402 || type === "invalid_request_error" && /credit|billing/i.test(body?.error?.message || "")) {
      return { kind: "billing", message: "AIサービスの利用上限に達している可能性があります。管理者にご確認ください。" };
    }
    if (httpStatus >= 500) {
      return { kind: "server", message: "AIサービス側で一時的な問題が発生しています。しばらくしてからもう一度お試しください。" };
    }
    return { kind: "unknown", message: "読み取りに失敗しました。画像の向き・明るさを変えてもう一度お試しください。" };
  }

  // /api/claude を叩き、429の場合のみ1回だけ自動リトライする
  async function callClaudeWithRetry(body, attempt = 0) {
    const res = await fetch("/api/claude", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      let errBody = null;
      try { errBody = await res.json(); } catch { /* JSON以外の応答 */ }

      // レート制限は少し待って1回だけ再試行（一時的な混雑はこれで解消することが多い）
      if (res.status === 429 && attempt < 1) {
        const retryAfterHeader = Number(res.headers.get("retry-after"));
        const waitMs = Number.isFinite(retryAfterHeader) && retryAfterHeader > 0
          ? retryAfterHeader * 1000
          : 3000;
        await sleep(waitMs);
        return callClaudeWithRetry(body, attempt + 1);
      }

      const info = classifyError(res.status, errBody);
      const err = new Error(info.message);
      err.info = info;
      throw err;
    }

    return res.json();
  }

  // ===== カメラ起動 =====
  async function startCamera() {
    setErrorInfo(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 960 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      armCamera();
    } catch (e) {
      setErrorInfo({ kind: "camera", message: "カメラを起動できませんでした。ブラウザのカメラ利用許可をご確認いただくか、下の「ファイルを選択」からお試しください。" });
      setMode("error");
    }
  }

  // 手ブレ検知を（再）開始できる状態にする
  function armCamera() {
    prevFrameRef.current = null;
    stableCountRef.current = 0;
    armedAtRef.current = Date.now();
    lockedRef.current = false;
    setResult(null);
    setPreview(null);
    setErrorInfo(null);
    setHint("レシートをカメラにかざしてください");
    setMode("camera");
  }

  function stopCamera() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    lockedRef.current = false;
    setMode("idle");
    setResult(null);
    setPreview(null);
    setErrorInfo(null);
  }

  // アンマウント時にカメラを確実に止める
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    };
  }, []);

  // ===== 手ブレ検知ループ（毎フレーム、縮小画像の差分をチェック） =====
  useEffect(() => {
    if (mode !== "camera") return;
    let active = true;

    const tick = () => {
      if (!active) return;
      if (!lockedRef.current && streamRef.current) {
        const video = videoRef.current;
        const ac = analyzeCanvasRef.current;
        if (video && ac && video.videoWidth) {
          const W = 32, H = 24;
          ac.width = W; ac.height = H;
          const ctx = ac.getContext("2d");
          ctx.drawImage(video, 0, 0, W, H);
          const frame = ctx.getImageData(0, 0, W, H).data;

          if (prevFrameRef.current) {
            let diff = 0;
            for (let i = 0; i < frame.length; i += 4) {
              diff += Math.abs(frame[i] - prevFrameRef.current[i]);
            }
            const avgDiff = diff / (W * H);
            stableCountRef.current = avgDiff < 6 ? stableCountRef.current + 1 : 0;
          }
          prevFrameRef.current = frame;

          // 起動直後（ピント調整中）の誤検知を避けるため、一定時間は待つ
          const readyToTrigger = Date.now() - armedAtRef.current > 700;
          if (readyToTrigger && stableCountRef.current >= 6) {
            stableCountRef.current = 0;
            lockedRef.current = true;
            captureAndScan();
          }
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => { active = false; if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [mode]);

  // ===== 静止を検知したら自動で撮影してAIへ送信 =====
  async function captureAndScan() {
    const video = videoRef.current;
    const cc = captureCanvasRef.current;
    if (!video || !cc || !video.videoWidth) { lockedRef.current = false; return; }

    cc.width = video.videoWidth;
    cc.height = video.videoHeight;
    cc.getContext("2d").drawImage(video, 0, 0);
    const dataUrl = cc.toDataURL("image/jpeg", 0.85);

    await runScan(dataUrl, "image/jpeg");
  }

  // ===== ファイル選択（カメラが使えない場合のフォールバック） =====
  async function handleFile(file) {
    if (!file || lockedRef.current) return;
    lockedRef.current = true;
    try {
      const dataUrl = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload  = () => res(r.result);
        r.onerror = () => rej(new Error("画像の読み込みに失敗しました"));
        r.readAsDataURL(file);
      });
      await runScan(dataUrl, file.type || "image/jpeg");
    } catch (e) {
      setErrorInfo({ kind: "unknown", message: e.message || "読み取りに失敗しました。" });
      setMode("error");
      lockedRef.current = false;
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  // ===== AI読み取り本体（カメラ自動撮影・ファイル選択どちらからも呼ばれる） =====
  async function runScan(dataUrl, mediaType) {
    setPreview(dataUrl);
    setMode("scanning");
    setHint("");

    try {
      const b64 = dataUrl.split(",")[1];
      const data = await callClaudeWithRetry({
        max_tokens: 300,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: b64 } },
            { type: "text",  text: RECEIPT_PROMPT },
          ],
        }],
      });

      const text = data.content?.find(b => b.type === "text")?.text || "";
      const json = text.match(/\{[\s\S]*\}/)?.[0];
      if (!json) {
        const err = new Error("領収書の内容をうまく読み取れませんでした。角度や明るさを変えてもう一度かざしてください。");
        err.info = { kind: "parse" };
        throw err;
      }
      const parsed = JSON.parse(json);

      // タップ不要で、読み取り結果をそのまま入力欄へ反映する
      onParsed({
        date:     parsed.date || todayKey(),
        name:     parsed.name || "",
        amount:   parsed.amount ? String(parsed.amount) : "",
        category: parsed.category || "other",
        memo:     parsed.memo || "",
      });

      setResult(parsed);
      setMode("done");

      // 結果をしばらく表示してから、タップ不要で次のかざし待機へ自動復帰
      if (streamRef.current) {
        await sleep(2400);
        if (streamRef.current) armCamera();
      }
    } catch (e) {
      setErrorInfo(e.info ? { ...e.info, message: e.message } : { kind: "unknown", message: e.message || "読み取りに失敗しました。もう一度お試しください。" });
      setMode("error");

      // カメラ起動中なら、数秒後にタップ不要で自動的に再挑戦できる状態へ戻す
      if (streamRef.current) {
        await sleep(3200);
        if (streamRef.current) armCamera();
      } else {
        lockedRef.current = false;
      }
    }
  }

  const cat = result ? EXPENSE_CATEGORIES.find(c => c.id === result.category) : null;
  const confColor = { high: "#5b8c5a", medium: "#d4a017", low: "#c0392b" };
  const showCameraView = mode === "camera" || mode === "scanning" || (mode === "done" && streamRef.current);

  return (
    <div style={{ background:"#110e07", border:"1.5px solid #3a2e18", borderRadius:14, padding:14, marginBottom:4 }}>
      <div style={{ fontSize:13, fontWeight:"bold", color:"#c8a96e", marginBottom:10 }}>📸 領収書スキャン（かざすだけ）</div>

      {mode === "idle" && (
        <div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display:"none" }}
            onChange={e => handleFile(e.target.files[0])} />
          <div style={{ display:"flex", gap:8 }}>
            <button style={{ ...S.btnGold, flex:2, background:"linear-gradient(135deg,#7b5ea7,#5b3d8f)", fontSize:13 }}
              onClick={startCamera}>
              📷 カメラをかざして読み取る
            </button>
            <button style={{ ...S.btnGold, flex:1, background:"#1a1208", border:"1px solid #3a2e18", color:"#888", fontSize:13 }}
              onClick={() => fileRef.current.click()}>
              🖼 ファイル
            </button>
          </div>
          <div style={{ fontSize:10, color:"#555", marginTop:6, textAlign:"center" }}>
            レシートをカメラにかざすだけで、タップ不要で日付・金額・勘定科目を自動読み取りします
          </div>
        </div>
      )}

      {showCameraView && (
        <div style={{ position:"relative" }}>
          <video ref={videoRef} playsInline muted
            style={{ width:"100%", borderRadius:8, background:"#000", display:"block" }} />
          <canvas ref={analyzeCanvasRef} style={{ display:"none" }} />
          <canvas ref={captureCanvasRef} style={{ display:"none" }} />

          {mode === "camera" && (
            <div style={{ position:"absolute", left:0, right:0, bottom:0, padding:"6px 10px", background:"linear-gradient(0deg,rgba(0,0,0,.75),transparent)", color:"#c8a96e", fontSize:12, textAlign:"center" }}>
              {hint}
            </div>
          )}
          {mode === "scanning" && (
            <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,.55)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
              <div style={{ fontSize:26, marginBottom:6 }}>🧠</div>
              <div style={{ fontSize:12, color:"#eee" }}>AIが読み取り中...</div>
            </div>
          )}
          {mode === "done" && result && (
            <div style={{ position:"absolute", left:0, right:0, bottom:0, padding:"8px 10px", background:"rgba(10,8,4,.92)", borderTop:`2px solid ${confColor[result.confidence]||"#5b8c5a"}` }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:3 }}>
                <span style={{ fontSize:11, color:"#5b8c5a" }}>✅ 入力欄に自動反映しました</span>
                <span style={{ fontSize:10, color: confColor[result.confidence]||"#888" }}>精度: {result.confidence==="high"?"高":result.confidence==="medium"?"中":"低"}</span>
              </div>
              <div style={{ fontSize:12, color:"#eee" }}>
                📅{result.date}　{cat?.icon} {cat?.label}　<span style={{ fontWeight:"bold" }}>¥{result.amount?.toLocaleString()}</span>
              </div>
              <div style={{ fontSize:10, color:"#888", marginTop:2 }}>{result.name}{result.memo ? `（${result.memo}）` : ""}</div>
            </div>
          )}

          <button onClick={stopCamera}
            style={{ position:"absolute", top:8, right:8, width:28, height:28, borderRadius:"50%", border:"none", background:"rgba(0,0,0,.6)", color:"#fff", fontSize:13, cursor:"pointer" }}>
            ✕
          </button>
        </div>
      )}

      {mode === "error" && (
        <div style={{ textAlign:"center", padding:"10px 0" }}>
          {preview && <img src={preview} alt="receipt" style={{ width:"100%", maxHeight:140, objectFit:"contain", borderRadius:8, marginBottom:10, opacity:0.6 }} />}
          <div style={{ fontSize:13, color:"#c0392b", marginBottom:6 }}>
            {errorInfo?.message || "読み取りに失敗しました"}
          </div>
          {errorInfo?.kind === "rate_limit" && (
            <div style={{ fontSize:11, color:"#666", marginBottom:10 }}>
              ※ 短時間に連続で読み取りを行うと発生しやすくなります。少し間隔をあけてお試しください。
            </div>
          )}
          {errorInfo?.kind === "camera" && (
            <div style={{ fontSize:11, color:"#666", marginBottom:10 }}>
              ※ この項目は入力フォームから手入力でも登録できます。
            </div>
          )}
          {(errorInfo?.kind === "auth" || errorInfo?.kind === "billing") && (
            <div style={{ fontSize:11, color:"#666", marginBottom:10 }}>
              ※ この項目は入力フォームから手入力でも登録できます。
            </div>
          )}
          <div style={{ display:"flex", gap:8, justifyContent:"center" }}>
            <button style={{ ...S.btnGray }} onClick={() => { streamRef.current ? armCamera() : (setMode("idle"), setPreview(null), setErrorInfo(null)); }}>
              もう一度試す
            </button>
            {streamRef.current && (
              <button style={{ ...S.btnGray }} onClick={stopCamera}>閉じる</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================
// 経理タブ（青色申告対応）
// =============================================

// 青色申告の勘定科目（居酒屋向け）
const EXPENSE_CATEGORIES = [
  { id: "food",      label: "仕入れ・材料費",   icon: "🥩", color: "#e07b4a" },
  { id: "labor",     label: "人件費・給与",      icon: "👷", color: "#7b5ea7" },
  { id: "rent",      label: "家賃・地代",        icon: "🏠", color: "#5b8c5a" },
  { id: "util",      label: "水道光熱費",        icon: "💡", color: "#d4a017" },
  { id: "misc",      label: "消耗品費",          icon: "🧻", color: "#888" },
  { id: "equip",     label: "器具・備品",        icon: "🔧", color: "#5b8c9a" },
  { id: "promo",     label: "広告宣伝費",        icon: "📣", color: "#c0392b" },
  { id: "trans",     label: "交通費",            icon: "🚃", color: "#3498db" },
  { id: "comm",      label: "通信費",            icon: "📱", color: "#27ae60" },
  { id: "insure",    label: "保険料",            icon: "🛡", color: "#8e44ad" },
  { id: "tax",       label: "租税公課",          icon: "📋", color: "#c0392b" },
  { id: "other",     label: "その他経費",        icon: "📦", color: "#555" },
];

// よく使う経費テンプレート（ワンタップ登録用）
const DEFAULT_QUICK_EXPENSES = [
  { id: "q1", name: "食材仕入れ",   category: "food",   amount: 0,    icon: "🥩" },
  { id: "q2", name: "アルバイト代", category: "labor",  amount: 0,    icon: "👷" },
  { id: "q3", name: "家賃",         category: "rent",   amount: 0,    icon: "🏠" },
  { id: "q4", name: "電気代",       category: "util",   amount: 0,    icon: "💡" },
  { id: "q5", name: "ガス代",       category: "util",   amount: 0,    icon: "🔥" },
  { id: "q6", name: "水道代",       category: "util",   amount: 0,    icon: "💧" },
  { id: "q7", name: "割り箸・紙皿", category: "misc",   amount: 0,    icon: "🥢" },
  { id: "q8", name: "交通費",       category: "trans",  amount: 0,    icon: "🚃" },
];

const KEY_EXPENSES    = "pos_expenses";      // 経費ログ（shared）
const KEY_QUICK_EXP   = "pos_quick_expenses"; // ワンタップテンプレ（ローカル）

function AccountingTab({ ordersData }) {
  // 経費ログ（shared storage）
  const [expenses, setExpenses]     = useState(null);
  const [expReady, setExpReady]     = useState(false);
  // ワンタップテンプレ（ローカル）
  const [quickList, setQuickList]   = useState(() => {
    try { return JSON.parse(localStorage.getItem(KEY_QUICK_EXP)) || DEFAULT_QUICK_EXPENSES; }
    catch { return DEFAULT_QUICK_EXPENSES; }
  });

  const [subTab, setSubTab]         = useState("dashboard"); // dashboard | expense | quick | tax
  const [selYear,  setSelYear]      = useState(new Date().getFullYear());
  const [selMonth, setSelMonth]     = useState(new Date().getMonth() + 1);

  // 経費入力フォーム
  const [form, setForm] = useState({ date: todayKey(), category: "food", name: "", amount: "", memo: "" });
  const [showQuickEdit, setShowQuickEdit] = useState(null); // quickItem id

  // load expenses from shared storage
  useEffect(() => {
    (async () => {
      try {
        const r = await window.storage.get(KEY_EXPENSES, true);
        if (r) setExpenses(JSON.parse(r.value));
        else setExpenses([]);
      } catch { setExpenses([]); }
      setExpReady(true);
    })();
  }, []);

  const persistExp = async (next) => {
    setExpenses(next);
    try { await window.storage.set(KEY_EXPENSES, JSON.stringify(next), true); } catch {}
  };
  const saveQuick = (next) => {
    setQuickList(next);
    localStorage.setItem(KEY_QUICK_EXP, JSON.stringify(next));
  };

  if (!expReady) return <div style={{ textAlign: "center", color: "#888", padding: 40 }}>読み込み中...</div>;

  const expData = expenses || [];

  // ========== 集計ヘルパー ==========
  // 月キー: "2025-06"
  const monthKey = (ts) => toJST(new Date(ts)).toISOString().slice(0, 7);
  const yearOf   = (ts) => toJST(new Date(ts)).getFullYear();

  // POS売上：月別
  const salesByMonth = {};
  ordersData.forEach(o => {
    const mk = o.dateKey.slice(0, 7);
    salesByMonth[mk] = (salesByMonth[mk] || 0) + o.total;
  });

  // 経費：月別
  const expByMonth = {};
  expData.forEach(e => {
    const mk = e.date.slice(0, 7);
    expByMonth[mk] = (expByMonth[mk] || 0) + e.amount;
  });

  // 全月キー（売上or経費のある月）
  const allMonths = [...new Set([...Object.keys(salesByMonth), ...Object.keys(expByMonth)])].sort((a,b)=>b.localeCompare(a));

  // 選択月のデータ
  const selMK     = `${selYear}-${String(selMonth).padStart(2,"0")}`;
  const selSales  = salesByMonth[selMK] || 0;
  const selExpAmt = expByMonth[selMK] || 0;
  const selProfit = selSales - selExpAmt;
  const selExps   = expData.filter(e => e.date.startsWith(selMK)).sort((a,b)=>b.date.localeCompare(a.date));

  // カテゴリ別経費（選択月）
  const catTotals = {};
  selExps.forEach(e => { catTotals[e.category] = (catTotals[e.category] || 0) + e.amount; });

  // 年間集計
  const yearSales  = Object.entries(salesByMonth).filter(([k])=>k.startsWith(selYear)).reduce((s,[,v])=>s+v,0);
  const yearExp    = expData.filter(e=>yearOf(new Date(e.date).getTime())===selYear).reduce((s,e)=>s+e.amount,0);
  const yearProfit = yearSales - yearExp;
  // 青色申告特別控除（簡易：65万円 or 所得の65万未満なら所得額）
  const blueDeduction = Math.min(650000, Math.max(0, yearProfit));
  const taxableIncome = Math.max(0, yearProfit - blueDeduction);

  // ========== 経費追加 ==========
  async function addExpense() {
    if (!form.amount || !form.name) return;
    const rec = { id: Date.now(), date: form.date, category: form.category, name: form.name, amount: parseInt(form.amount), memo: form.memo };
    await persistExp([rec, ...expData]);
    setForm(f => ({ ...f, name: "", amount: "", memo: "" }));
  }

  async function addQuickExpense(q, amount) {
    if (!amount) return;
    const rec = { id: Date.now(), date: todayKey(), category: q.category, name: q.name, amount: parseInt(amount), memo: "ワンタップ登録" };
    await persistExp([rec, ...expData]);
  }

  async function deleteExpense(id) {
    await persistExp(expData.filter(e => e.id !== id));
  }

  // CSV出力（年間）
  function exportTaxCSV() {
    const rows = [["日付","勘定科目","内容","金額","メモ","種別"]];
    // 売上
    ordersData.filter(o=>yearOf(new Date(o.ts).getTime())===selYear).forEach(o=>{
      rows.push([o.dateKey,"売上","飲食店売上",o.total,"","収入"]);
    });
    // 経費
    expData.filter(e=>yearOf(new Date(e.date).getTime())===selYear).forEach(e=>{
      const cat = EXPENSE_CATEGORIES.find(c=>c.id===e.category)?.label || e.category;
      rows.push([e.date,cat,e.name,e.amount,e.memo||"","支出"]);
    });
    const csv = rows.map(r=>r.join(",")).join("\n");
    const blob = new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8;"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href=url; a.download=`確定申告_${selYear}年.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  // ========== UI ==========
  const months = Array.from({length:12},(_,i)=>i+1);
  const years  = [2024,2025,2026];

  return (
    <div>
      {/* サブタブ */}
      <div style={{ display:"flex", background:"#110e07", borderBottom:"1px solid #2a2010", marginBottom:12, marginLeft:-12, marginRight:-12, paddingLeft:12 }}>
        {[["dashboard","📊 月次"],["expense","➕ 経費入力"],["quick","⚡ ワンタップ"],["tax","📋 確定申告"]].map(([v,l])=>(
          <button key={v} style={{ padding:"10px 10px", background:"transparent", border:"none", color: subTab===v ? "#c8a96e" : "#555", fontSize:12, cursor:"pointer", borderBottom:`2px solid ${subTab===v?"#c8a96e":"transparent"}`, whiteSpace:"nowrap" }}
            onClick={()=>setSubTab(v)}>{l}</button>
        ))}
      </div>

      {/* ===== 月次ダッシュボード ===== */}
      {subTab==="dashboard" && (
        <div>
          {/* 年月セレクタ */}
          <div style={{ display:"flex", gap:8, marginBottom:12 }}>
            <select style={{ ...S.input, flex:1, fontSize:13 }} value={selYear} onChange={e=>setSelYear(Number(e.target.value))}>
              {years.map(y=><option key={y} value={y}>{y}年</option>)}
            </select>
            <select style={{ ...S.input, flex:1, fontSize:13 }} value={selMonth} onChange={e=>setSelMonth(Number(e.target.value))}>
              {months.map(m=><option key={m} value={m}>{m}月</option>)}
            </select>
          </div>

          {/* 月次サマリー */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:12 }}>
            <div style={{ ...S.statCard, borderColor:"#5b8c5a" }}>
              <div style={{ fontSize:13, fontWeight:"bold", color:"#5b8c5a" }}>{fmt(selSales)}</div>
              <div style={S.statLabel}>売上（POS）</div>
            </div>
            <div style={{ ...S.statCard, borderColor:"#c0392b" }}>
              <div style={{ fontSize:13, fontWeight:"bold", color:"#c0392b" }}>{fmt(selExpAmt)}</div>
              <div style={S.statLabel}>経費合計</div>
            </div>
            <div style={{ ...S.statCard, borderColor: selProfit>=0?"#c8a96e":"#c0392b" }}>
              <div style={{ fontSize:13, fontWeight:"bold", color: selProfit>=0?"#c8a96e":"#c0392b" }}>{selProfit<0?"▼":""}{fmt(Math.abs(selProfit))}</div>
              <div style={S.statLabel}>利益</div>
            </div>
          </div>

          {/* カテゴリ別経費 */}
          {Object.keys(catTotals).length > 0 && (
            <div style={S.chartCard}>
              <div style={S.chartTitle}>📂 経費内訳</div>
              {Object.entries(catTotals).sort((a,b)=>b[1]-a[1]).map(([catId, amt])=>{
                const cat = EXPENSE_CATEGORIES.find(c=>c.id===catId);
                const pct = selExpAmt ? Math.round(amt/selExpAmt*100) : 0;
                return (
                  <div key={catId} style={{ marginBottom:8 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:3 }}>
                      <span>{cat?.icon} {cat?.label}</span>
                      <span style={{ color:"#c8a96e" }}>{fmt(amt)} <span style={{ color:"#666" }}>({pct}%)</span></span>
                    </div>
                    <div style={{ height:6, background:"#2a2010", borderRadius:3 }}>
                      <div style={{ height:"100%", borderRadius:3, width:`${pct}%`, background: cat?.color || "#c8a96e" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 月次推移グラフ（直近6ヶ月） */}
          {allMonths.length > 0 && (
            <div style={S.chartCard}>
              <div style={S.chartTitle}>📅 月次推移（収入 / 支出 / 利益）</div>
              <div style={{ display:"flex", gap:3, alignItems:"flex-end", height:100 }}>
                {allMonths.slice(0,6).reverse().map(mk=>{
                  const s = salesByMonth[mk]||0;
                  const e = expByMonth[mk]||0;
                  const p = s - e;
                  const maxVal = Math.max(...allMonths.slice(0,6).map(m=>salesByMonth[m]||0), 1);
                  return (
                    <div key={mk} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:2 }}>
                      <div style={{ width:"100%", display:"flex", gap:1, alignItems:"flex-end", height:80 }}>
                        <div style={{ flex:1, background:"#5b8c5a", borderRadius:"2px 2px 0 0", height:`${(s/maxVal)*100}%`, minHeight: s?2:0 }} title="売上" />
                        <div style={{ flex:1, background:"#c0392b", borderRadius:"2px 2px 0 0", height:`${(e/maxVal)*100}%`, minHeight: e?2:0 }} title="経費" />
                        <div style={{ flex:1, background: p>=0?"#c8a96e":"#e07b4a", borderRadius:"2px 2px 0 0", height:`${(Math.abs(p)/maxVal)*100}%`, minHeight: p?2:0 }} title="利益" />
                      </div>
                      <div style={{ fontSize:8, color:"#666", textAlign:"center" }}>{mk.slice(5)}月</div>
                    </div>
                  );
                })}
              </div>
              <div style={{ display:"flex", gap:12, marginTop:6, fontSize:10, color:"#888" }}>
                <span><span style={{ color:"#5b8c5a" }}>■</span> 売上</span>
                <span><span style={{ color:"#c0392b" }}>■</span> 経費</span>
                <span><span style={{ color:"#c8a96e" }}>■</span> 利益</span>
              </div>
            </div>
          )}

          {/* 当月経費リスト */}
          <div style={S.chartCard}>
            <div style={S.chartTitle}>🧾 {selMonth}月の経費明細</div>
            {selExps.length===0 && <div style={{ color:"#555", fontSize:12, textAlign:"center", padding:10 }}>経費データなし</div>}
            {selExps.map(e=>{
              const cat = EXPENSE_CATEGORIES.find(c=>c.id===e.category);
              return (
                <div key={e.id} style={{ display:"flex", alignItems:"center", gap:8, padding:"7px 0", borderBottom:"1px solid #1a1208", fontSize:13 }}>
                  <span style={{ fontSize:16 }}>{cat?.icon}</span>
                  <div style={{ flex:1 }}>
                    <div>{e.name}</div>
                    <div style={{ fontSize:10, color:"#666" }}>{e.date} · {cat?.label}</div>
                    {e.memo && <div style={{ fontSize:10, color:"#555" }}>📝 {e.memo}</div>}
                  </div>
                  <span style={{ color:"#c0392b", fontWeight:"bold" }}>▼{fmt(e.amount)}</span>
                  <button style={{ background:"transparent", border:"none", color:"#444", cursor:"pointer", fontSize:14 }} onClick={()=>deleteExpense(e.id)}>✕</button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ===== 経費入力 ===== */}
      {subTab==="expense" && (
        <div>
          <div style={{ fontSize:13, fontWeight:"bold", color:"#c8a96e", marginBottom:12 }}>➕ 経費を追加</div>

          {/* 領収書スキャン */}
          <ReceiptScanner onParsed={(parsed)=>setForm(f=>({...f,...parsed}))} />

          <div style={{ display:"flex", flexDirection:"column", gap:10, marginTop:16 }}>
            <div>
              <div style={S.formLabel}>日付</div>
              <input type="date" style={S.input} value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} />
            </div>
            <div>
              <div style={S.formLabel}>勘定科目</div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                {EXPENSE_CATEGORIES.map(cat=>(
                  <button key={cat.id} style={{ padding:"6px 10px", borderRadius:20, border:`1.5px solid ${form.category===cat.id ? cat.color : "#2a2010"}`, background: form.category===cat.id ? cat.color+"33" : "#1a1208", color: form.category===cat.id ? cat.color : "#666", fontSize:11, cursor:"pointer" }}
                    onClick={()=>setForm(f=>({...f,category:cat.id}))}>
                    {cat.icon} {cat.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div style={S.formLabel}>内容</div>
              <input style={S.input} placeholder="例: 食材仕入れ（業務スーパー）" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} />
            </div>
            <div>
              <div style={S.formLabel}>金額（円）</div>
              <input type="number" style={S.input} placeholder="0" value={form.amount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))} />
            </div>
            <div>
              <div style={S.formLabel}>メモ（任意）</div>
              <input style={S.input} placeholder="領収書No.など" value={form.memo} onChange={e=>setForm(f=>({...f,memo:e.target.value}))} />
            </div>
            <button style={{ ...S.btnGold, fontSize:15, opacity: (!form.amount||!form.name)?0.4:1 }} onClick={addExpense} disabled={!form.amount||!form.name}>
              💾 経費を登録する
            </button>
          </div>

          {/* 最近の経費 */}
          <div style={{ marginTop:20 }}>
            <div style={{ fontSize:13, fontWeight:"bold", color:"#888", marginBottom:8 }}>直近の登録</div>
            {expData.slice(0,10).map(e=>{
              const cat = EXPENSE_CATEGORIES.find(c=>c.id===e.category);
              return (
                <div key={e.id} style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 0", borderBottom:"1px solid #1a1208", fontSize:13 }}>
                  <span>{cat?.icon}</span>
                  <div style={{ flex:1 }}>
                    <div>{e.name}</div>
                    <div style={{ fontSize:10, color:"#666" }}>{e.date} · {cat?.label}</div>
                  </div>
                  <span style={{ color:"#c0392b", fontWeight:"bold" }}>▼{fmt(e.amount)}</span>
                  <button style={{ background:"transparent", border:"none", color:"#444", cursor:"pointer" }} onClick={()=>deleteExpense(e.id)}>✕</button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ===== ワンタップ登録 ===== */}
      {subTab==="quick" && (
        <div>
          <div style={{ fontSize:13, color:"#888", marginBottom:4, lineHeight:1.6 }}>
            前回の金額をそのまま表示します。変わった分だけ上書きして「まとめて登録」を押してください。
          </div>

          {/* まとめて登録ボタン（上部固定） */}
          <BulkQuickRegister
            quickList={quickList}
            expData={expData}
            onBulkRegister={async (items)=>{
              const recs = items.map(({q, amt})=>({
                id: Date.now()+Math.random(),
                date: todayKey(),
                category: q.category,
                name: q.name,
                amount: parseInt(amt),
                memo: "仕入れ帳",
              }));
              await persistExp([...recs, ...expData]);
            }}
            onEditTemplate={(id, updates)=>{
              const next = quickList.map(x=>x.id===id?{...x,...updates}:x);
              saveQuick(next);
            }}
          />

          <button style={{ ...S.btnGold, marginTop:14, background:"#1a1208", border:"1.5px dashed #3a2e18", color:"#555", fontSize:13 }}
            onClick={()=>{
              const next = [...quickList, { id:"q"+Date.now(), name:"新しい経費", category:"other", amount:0, icon:"📦" }];
              saveQuick(next);
            }}>＋ 項目を追加</button>
        </div>
      )}

      {/* ===== 確定申告サマリー ===== */}
      {subTab==="tax" && (
        <div>
          <div style={{ display:"flex", gap:8, marginBottom:14, alignItems:"center" }}>
            <select style={{ ...S.input, flex:1, fontSize:13 }} value={selYear} onChange={e=>setSelYear(Number(e.target.value))}>
              {years.map(y=><option key={y} value={y}>{y}年（{y}年分申告）</option>)}
            </select>
          </div>

          {/* 年間サマリー */}
          <div style={{ background:"#1a1208", border:"1.5px solid #c8a96e", borderRadius:14, padding:16, marginBottom:14 }}>
            <div style={{ fontSize:14, fontWeight:"bold", color:"#c8a96e", marginBottom:12 }}>📋 {selYear}年 確定申告サマリー</div>
            {[
              { label:"① 売上（総収入金額）",    value: yearSales,      color:"#5b8c5a" },
              { label:"② 経費合計（必要経費）",   value: yearExp,        color:"#c0392b", minus:true },
              { label:"③ 事業所得（①－②）",      value: yearProfit,     color: yearProfit>=0?"#c8a96e":"#e07b4a" },
              { label:"④ 青色申告特別控除（65万）",value: blueDeduction,  color:"#7b5ea7", minus:true },
              { label:"⑤ 課税所得（③－④）",      value: taxableIncome,  color: taxableIncome>0?"#e07b4a":"#5b8c5a" },
            ].map(({label,value,color,minus})=>(
              <div key={label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:"1px solid #2a2010", fontSize:13 }}>
                <span style={{ color:"#aaa", flex:1 }}>{label}</span>
                <span style={{ fontWeight:"bold", color, fontSize:15 }}>{minus?"▼":""}{fmt(Math.abs(value))}</span>
              </div>
            ))}
          </div>

          {/* 月別内訳テーブル */}
          <div style={S.chartCard}>
            <div style={S.chartTitle}>📅 月別内訳（{selYear}年）</div>
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                <thead>
                  <tr style={{ color:"#888", borderBottom:"1px solid #2a2010" }}>
                    <th style={{ textAlign:"left", padding:"4px 4px" }}>月</th>
                    <th style={{ textAlign:"right", padding:"4px 4px" }}>売上</th>
                    <th style={{ textAlign:"right", padding:"4px 4px" }}>経費</th>
                    <th style={{ textAlign:"right", padding:"4px 4px" }}>利益</th>
                  </tr>
                </thead>
                <tbody>
                  {months.map(m=>{
                    const mk = `${selYear}-${String(m).padStart(2,"0")}`;
                    const s = salesByMonth[mk]||0;
                    const e = expByMonth[mk]||0;
                    const p = s - e;
                    return (
                      <tr key={m} style={{ borderBottom:"1px solid #1a1208", cursor:"pointer" }}
                        onClick={()=>{ setSelMonth(m); setSubTab("dashboard"); }}>
                        <td style={{ padding:"6px 4px", color:"#888" }}>{m}月</td>
                        <td style={{ padding:"6px 4px", textAlign:"right", color:"#5b8c5a" }}>{s?fmt(s):"-"}</td>
                        <td style={{ padding:"6px 4px", textAlign:"right", color:"#c0392b" }}>{e?fmt(e):"-"}</td>
                        <td style={{ padding:"6px 4px", textAlign:"right", color: p>0?"#c8a96e":p<0?"#e07b4a":"#555", fontWeight:"bold" }}>{p?`${p<0?"▼":""}${fmt(Math.abs(p))}`:"-"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* カテゴリ別年間経費 */}
          <div style={S.chartCard}>
            <div style={S.chartTitle}>📂 経費カテゴリ別（年間）</div>
            {(() => {
              const yearCat = {};
              expData.filter(e=>yearOf(new Date(e.date).getTime())===selYear).forEach(e=>{
                yearCat[e.category]=(yearCat[e.category]||0)+e.amount;
              });
              const entries = Object.entries(yearCat).sort((a,b)=>b[1]-a[1]);
              const maxV = Math.max(...entries.map(x=>x[1]),1);
              return entries.length===0
                ? <div style={{ color:"#555", fontSize:12, textAlign:"center", padding:10 }}>経費データなし</div>
                : entries.map(([catId,amt])=>{
                    const cat = EXPENSE_CATEGORIES.find(c=>c.id===catId);
                    return (
                      <div key={catId} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                        <span style={{ fontSize:16, minWidth:20 }}>{cat?.icon}</span>
                        <span style={{ fontSize:12, flex:1, color:"#aaa" }}>{cat?.label}</span>
                        <div style={{ width:70, height:7, background:"#2a2010", borderRadius:3 }}>
                          <div style={{ height:"100%", borderRadius:3, width:`${(amt/maxV)*100}%`, background: cat?.color||"#c8a96e" }} />
                        </div>
                        <span style={{ fontSize:12, color:"#c8a96e", minWidth:70, textAlign:"right" }}>{fmt(amt)}</span>
                      </div>
                    );
                  });
            })()}
          </div>

          {/* CSV出力 */}
          <button style={{ ...S.btnGold, background:"linear-gradient(135deg,#5b8c5a,#3a6a3a)", fontSize:14 }} onClick={exportTaxCSV}>
            📥 確定申告用CSVをダウンロード
          </button>
          <div style={{ fontSize:11, color:"#555", marginTop:8, lineHeight:1.6 }}>
            ※ 売上・経費を1ファイルにまとめた帳簿データです。<br/>
            会計ソフト（freee・弥生・マネーフォワード）へのインポートにも使えます。
          </div>
        </div>
      )}
    </div>
  );
}

// 仕入れ帳：まとめて登録コンポーネント
function BulkQuickRegister({ quickList, expData, onBulkRegister, onEditTemplate }) {
  // 各項目の前回金額を取得
  const lastAmounts = {};
  quickList.forEach(q => {
    const last = [...expData].filter(e => e.name === q.name).sort((a,b) => b.id - a.id)[0];
    if (last) lastAmounts[q.id] = last.amount;
  });

  // 入力state：{ [q.id]: string }
  const [amounts, setAmounts] = useState(() => {
    const init = {};
    quickList.forEach(q => { init[q.id] = lastAmounts[q.id] ? String(lastAmounts[q.id]) : ""; });
    return init;
  });
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName]   = useState("");
  const [editCat,  setEditCat]    = useState("");
  const [done, setDone]           = useState(false);

  // quickListが変わったらamountsを同期
  useEffect(() => {
    setAmounts(prev => {
      const next = { ...prev };
      quickList.forEach(q => { if (!(q.id in next)) next[q.id] = lastAmounts[q.id] ? String(lastAmounts[q.id]) : ""; });
      return next;
    });
  }, [quickList.length]);

  const filledItems = quickList.filter(q => amounts[q.id] && parseInt(amounts[q.id]) > 0);
  const bulkTotal   = filledItems.reduce((s, q) => s + parseInt(amounts[q.id]), 0);

  async function handleBulk() {
    if (filledItems.length === 0) return;
    await onBulkRegister(filledItems.map(q => ({ q, amt: amounts[q.id] })));
    setDone(true);
    setTimeout(() => setDone(false), 2000);
  }

  return (
    <div>
      {/* 一覧 */}
      <div style={{ display:"flex", flexDirection:"column", gap:6, marginBottom:12 }}>
        {quickList.map(q => {
          const cat     = EXPENSE_CATEGORIES.find(c => c.id === q.category);
          const lastAmt = lastAmounts[q.id];
          const cur     = parseInt(amounts[q.id]);
          const changed = lastAmt && cur && cur !== lastAmt;
          const isEdit  = editingId === q.id;

          return (
            <div key={q.id} style={{ background:"#1a1208", border:`1.5px solid ${changed?"#e07b4a":"#2a2010"}`, borderRadius:10, padding:"10px 12px" }}>
              {!isEdit ? (
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{ fontSize:18 }}>{q.icon}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:"bold" }}>{q.name}</div>
                    <div style={{ fontSize:10, color: cat?.color||"#888" }}>{cat?.label}</div>
                  </div>
                  {changed && (
                    <span style={{ fontSize:9, color:"#e07b4a", whiteSpace:"nowrap" }}>
                      前回{(lastAmt).toLocaleString()}→
                    </span>
                  )}
                  {!changed && lastAmt && (
                    <span style={{ fontSize:9, color:"#555", whiteSpace:"nowrap" }}>前回{lastAmt.toLocaleString()}</span>
                  )}
                  <input
                    type="number"
                    style={{ width:90, padding:"6px 8px", background:"#110e07", border:`1px solid ${changed?"#e07b4a":"#3a2e18"}`, borderRadius:6, color: changed?"#e07b4a":"#e8dcc8", fontSize:14, textAlign:"right" }}
                    placeholder="金額"
                    value={amounts[q.id]}
                    onChange={e => setAmounts(prev => ({ ...prev, [q.id]: e.target.value }))}
                  />
                  <span style={{ fontSize:11, color:"#666" }}>円</span>
                  <button style={{ background:"transparent", border:"none", color:"#444", cursor:"pointer", fontSize:11, padding:"2px 4px" }}
                    onClick={() => { setEditingId(q.id); setEditName(q.name); setEditCat(q.category); }}>✎</button>
                </div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  <input style={{ ...S.input, fontSize:13 }} value={editName} onChange={e=>setEditName(e.target.value)} placeholder="名称" />
                  <select style={{ ...S.input, fontSize:12 }} value={editCat} onChange={e=>setEditCat(e.target.value)}>
                    {EXPENSE_CATEGORIES.map(c=><option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
                  </select>
                  <div style={{ display:"flex", gap:6 }}>
                    <button style={{ ...S.btnGray, flex:1, padding:"8px" }} onClick={()=>setEditingId(null)}>キャンセル</button>
                    <button style={{ ...S.btnGold, flex:2, padding:"8px" }} onClick={()=>{ onEditTemplate(q.id,{name:editName,category:editCat}); setEditingId(null); }}>保存</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* まとめて登録ボタン */}
      <div style={{ background:"#1a1208", border:"1px solid #2a2010", borderRadius:12, padding:12 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
          <span style={{ fontSize:13, color:"#888" }}>登録予定 {filledItems.length}件</span>
          <span style={{ fontSize:16, fontWeight:"bold", color:"#c0392b" }}>
            ▼{filledItems.reduce((s,q)=>s+parseInt(amounts[q.id]),0).toLocaleString()}円
          </span>
        </div>
        <button
          style={{ ...S.btnGold, background: done?"#0d1a0d": filledItems.length===0?"#1a1208":"linear-gradient(135deg,#c8a96e,#a0793a)", color: done?"#5b8c5a": filledItems.length===0?"#555":"#0d0a06", border: filledItems.length===0?"1px solid #2a2010":"none", fontSize:15, cursor: filledItems.length===0?"default":"pointer" }}
          onClick={handleBulk} disabled={filledItems.length===0||done}
        >
          {done ? "✅ 登録しました！" : `📥 ${filledItems.length}件をまとめて登録`}
        </button>
      </div>
    </div>
  );
}

// ワンタップ経費アイテム（仕入れ帳方式）
function QuickExpenseItem({ q, lastAmount, onRegister, onEditTemplate }) {
  const [inputAmt, setInputAmt] = useState(lastAmount ? String(lastAmount) : "");
  const [editing, setEditing]   = useState(false);
  const [editName, setEditName] = useState(q.name);
  const [editCat,  setEditCat]  = useState(q.category);
  const cat = EXPENSE_CATEGORIES.find(c=>c.id===q.category);
  const changed = lastAmount && inputAmt && parseInt(inputAmt) !== lastAmount;

  return (
    <div style={{ background:"#1a1208", border:`1.5px solid ${changed?"#e07b4a":"#2a2010"}`, borderRadius:12, padding:12 }}>
      {!editing ? (
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
            <span style={{ fontSize:20 }}>{q.icon}</span>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:14, fontWeight:"bold" }}>{q.name}</div>
              <div style={{ fontSize:10, color: cat?.color||"#888" }}>{cat?.icon} {cat?.label}</div>
            </div>
            {changed && <span style={{ fontSize:10, color:"#e07b4a" }}>価格変動</span>}
            <button style={{ background:"transparent", border:"none", color:"#555", cursor:"pointer", fontSize:12 }} onClick={()=>setEditing(true)}>✎</button>
          </div>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            <div style={{ flex:1, position:"relative" }}>
              <input type="number" style={{ ...S.input, fontSize:14, paddingRight: lastAmount?"60px":"12px" }}
                placeholder="金額" value={inputAmt} onChange={e=>setInputAmt(e.target.value)} />
              {lastAmount && (
                <span style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", fontSize:10, color:"#555", pointerEvents:"none" }}>
                  前回{fmt(lastAmount).replace("円","")}
                </span>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          <input style={S.input} value={editName} onChange={e=>setEditName(e.target.value)} placeholder="名称" />
          <select style={{ ...S.input, fontSize:12 }} value={editCat} onChange={e=>setEditCat(e.target.value)}>
            {EXPENSE_CATEGORIES.map(c=><option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
          </select>
          <div style={{ display:"flex", gap:8 }}>
            <button style={{ ...S.btnGray, flex:1 }} onClick={()=>setEditing(false)}>キャンセル</button>
            <button style={{ ...S.btnGold, flex:2 }} onClick={()=>{ onEditTemplate({name:editName,category:editCat}); setEditing(false); }}>保存</button>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================
// AI戦略タブ
// =============================================
function AIStrategyTab({ ordersData, dailiesData, customers }) {
  const [selectedDate, setSelectedDate] = useState(todayKey());
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [savedReports, setSavedReports] = useState(() => {
    try { return JSON.parse(localStorage.getItem("ai_strategy_reports") || "[]"); } catch { return []; }
  });
  const [viewSaved, setViewSaved] = useState(null);

  // 利用可能な日付一覧
  const availableDates = [...new Set([
    ...ordersData.map(o => o.dateKey),
    ...dailiesData.map(d => d.date),
  ])].sort((a, b) => b.localeCompare(a));

  async function generate() {
    setLoading(true); setReport(null);

    // 指定日のデータ収集
    const dayOrders = ordersData.filter(o => o.dateKey === selectedDate);
    const dayReport = dailiesData.find(d => d.date === selectedDate);

    const totalRevenue = dayOrders.reduce((s, o) => s + o.total, 0);
    const orderCount = dayOrders.length;
    const avgOrder = orderCount ? Math.round(totalRevenue / orderCount) : 0;
    const uniqueCustomers = [...new Set(dayOrders.map(o => o.customerName))].length;

    // メニュー別集計
    const itemSales = {};
    const itemQty = {};
    dayOrders.forEach(o => o.items.forEach(i => {
      itemSales[i.itemName] = (itemSales[i.itemName] || 0) + i.price * i.qty;
      itemQty[i.itemName]   = (itemQty[i.itemName]   || 0) + i.qty;
    }));
    const topByRevenue = Object.entries(itemSales).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const topByQty     = Object.entries(itemQty).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const bottomItems  = Object.entries(itemSales).sort((a, b) => a[1] - b[1]).slice(0, 3);

    // カテゴリ別売上
    const catSales = { ドリンク: 0, 串もの: 0, 揚げ物: 0, スピード: 0, 一品: 0, "1000べろ": 0 };
    const catMap = { d: "ドリンク", k: "串もの", a: "揚げ物", s: "スピード", i: "一品", sp: "1000べろ" };
    dayOrders.forEach(o => o.items.forEach(i => {
      const cat = catMap[i.itemId?.match(/^([a-z]+)/)?.[1]] || "その他";
      if (cat in catSales) catSales[cat] += i.price * i.qty;
    }));

    // 前日比較
    const yesterday = new Date(new Date(selectedDate).getTime() - 86400000).toISOString().slice(0, 10);
    const prevOrders = ordersData.filter(o => o.dateKey === yesterday);
    const prevRevenue = prevOrders.reduce((s, o) => s + o.total, 0);
    const diffPercent = prevRevenue ? Math.round((totalRevenue - prevRevenue) / prevRevenue * 100) : null;

    // 顧客分析
    const repeatRate = customers.length ? Math.round(customers.filter(c => c.visits > 1).length / customers.length * 100) : 0;
    const newToday = dayOrders.filter(o => {
      const c = customers.find(c => c.name === o.customerName);
      return c && c.visits === 1;
    }).length;

    // 時間帯別（注文のts使用）
    const hourSales = {};
    dayOrders.forEach(o => {
      const h = toJST(new Date(o.ts)).getHours();
      hourSales[h] = (hourSales[h] || 0) + o.total;
    });
    const peakHour = Object.entries(hourSales).sort((a, b) => b[1] - a[1])[0];

    const prompt = `あなたは飲食業・居酒屋経営の専門コンサルタントです。以下の【${selectedDate}の営業データ】を基に、プロ経営者目線で具体的かつ実行可能な改善提案レポートを作成してください。

【${selectedDate} 営業データ】
▶ 売上サマリー
- 総売上: ${totalRevenue.toLocaleString()}円
- 注文件数: ${orderCount}件
- 客単価: ${avgOrder.toLocaleString()}円
- 来客組数: ${uniqueCustomers}組
${diffPercent !== null ? `- 前日比: ${diffPercent > 0 ? "+" : ""}${diffPercent}%（前日${prevRevenue.toLocaleString()}円）` : ""}

▶ メニュー売上（売上額Top5）
${topByRevenue.map(([n, v], i) => `  ${i+1}. ${n}：${v.toLocaleString()}円`).join("\n")}

▶ 注文数Top5
${topByQty.map(([n, q], i) => `  ${i+1}. ${n}：${q}個`).join("\n")}

▶ 売上の少ないメニュー（下位3品）
${bottomItems.map(([n, v]) => `  ${n}：${v.toLocaleString()}円`).join("\n")}

▶ カテゴリ別売上
${Object.entries(catSales).filter(([,v])=>v>0).map(([k,v])=>`  ${k}：${v.toLocaleString()}円`).join("\n") || "  データなし"}

▶ 顧客データ
- 累計顧客数: ${customers.length}人 / リピート率: ${repeatRate}%
- 本日の新規顧客: ${newToday}組
${peakHour ? `- ピーク時間帯: ${peakHour[0]}時台（${peakHour[1].toLocaleString()}円）` : ""}

---
以下の形式で分析・改善提案を作成してください：

## 📊 本日の経営評価
（総合コメントを3〜4文で。数値に基づいた客観的な評価）

## 🚨 優先改善ポイント（3項目）
各項目について：
- **課題**：何が問題か（データを引用）
- **原因仮説**：なぜそうなっているか
- **具体的アクション**：明日から実行できる施策（できれば数値目標付き）

## 💰 売上アップ施策（2項目）
すぐ実行できる売上向上アイデア（メニュー・価格・オペレーション）

## 🔁 リピーター獲得策（2項目）
顧客データを踏まえた具体的な施策

## ✅ 今週のアクションプラン
優先順位をつけて3〜5項目のToDoリスト形式で

---
数値・データに基づいて具体的に。抽象論は避け、この店舗の実態に即したアドバイスを。`;

    try {
      const res = await fetch("/api/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1500,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const data = await res.json();
      const text = data.content?.find(b => b.type === "text")?.text || "生成に失敗しました。";
      const newReport = { id: Date.now(), date: selectedDate, text, generatedAt: Date.now(), revenue: totalRevenue };
      setReport(newReport);
      // ローカル保存（最新5件）
      const next = [newReport, ...savedReports.filter(r => r.date !== selectedDate)].slice(0, 5);
      setSavedReports(next);
      localStorage.setItem("ai_strategy_reports", JSON.stringify(next));
    } catch (e) {
      setReport({ id: 0, date: selectedDate, text: "エラー: " + e.message, generatedAt: Date.now(), revenue: 0 });
    }
    setLoading(false);
  }

  // Markdownっぽいテキストをレンダリング
  function renderReport(text) {
    return text.split("\n").map((line, i) => {
      if (!line.trim()) return <div key={i} style={{ height: 6 }} />;
      if (line.startsWith("## ")) return (
        <div key={i} style={{ fontSize: 15, fontWeight: "bold", color: "#c8a96e", marginTop: 16, marginBottom: 6, borderBottom: "1px solid #2a2010", paddingBottom: 4 }}>{line.replace("## ", "")}</div>
      );
      if (line.startsWith("- **") || line.match(/^- \*\*/)) {
        const parts = line.replace(/^- /, "").split(/\*\*(.*?)\*\*/g);
        return (
          <div key={i} style={{ display: "flex", gap: 6, marginBottom: 4, paddingLeft: 8 }}>
            <span style={{ color: "#c8a96e", minWidth: 8 }}>•</span>
            <span style={{ fontSize: 13, lineHeight: 1.6 }}>
              {parts.map((p, j) => j % 2 === 1 ? <strong key={j} style={{ color: "#e8dcc8" }}>{p}</strong> : p)}
            </span>
          </div>
        );
      }
      if (line.startsWith("- ") || line.startsWith("• ")) return (
        <div key={i} style={{ display: "flex", gap: 6, marginBottom: 4, paddingLeft: 8 }}>
          <span style={{ color: "#c8a96e", minWidth: 8 }}>•</span>
          <span style={{ fontSize: 13, lineHeight: 1.6 }}>{line.replace(/^[-•] /, "")}</span>
        </div>
      );
      if (line.match(/^\d+\./)) return (
        <div key={i} style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 4, paddingLeft: 8 }}>{line}</div>
      );
      if (line.match(/\*\*(.*?)\*\*/)) {
        const parts = line.split(/\*\*(.*?)\*\*/g);
        return (
          <div key={i} style={{ fontSize: 13, lineHeight: 1.7, marginBottom: 2 }}>
            {parts.map((p, j) => j % 2 === 1 ? <strong key={j} style={{ color: "#e8dcc8" }}>{p}</strong> : p)}
          </div>
        );
      }
      return <div key={i} style={{ fontSize: 13, lineHeight: 1.7, marginBottom: 2 }}>{line}</div>;
    });
  }

  const displayReport = viewSaved || report;

  return (
    <div>
      {/* ヘッダー */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 17, fontWeight: "bold", color: "#c8a96e" }}>💡 AI経営改善レポート</div>
        <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>日別売上データからプロ目線の改善策を生成</div>
      </div>

      {/* 日付選択 */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>分析する日付</div>
          {availableDates.length > 0 ? (
            <select style={{ ...S.input, fontSize: 13 }} value={selectedDate} onChange={e => { setSelectedDate(e.target.value); setReport(null); setViewSaved(null); }}>
              <option value={todayKey()}>本日（{todayKey()}）</option>
              {availableDates.filter(d => d !== todayKey()).map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          ) : (
            <input type="date" style={{ ...S.input, fontSize: 13 }} value={selectedDate} onChange={e => { setSelectedDate(e.target.value); setReport(null); setViewSaved(null); }} />
          )}
        </div>
      </div>

      {/* 当日サマリー */}
      {(() => {
        const dayOrders = ordersData.filter(o => o.dateKey === selectedDate);
        const rev = dayOrders.reduce((s, o) => s + o.total, 0);
        const cnt = dayOrders.length;
        const avg = cnt ? Math.round(rev / cnt) : 0;
        const uni = [...new Set(dayOrders.map(o => o.customerName))].length;
        return dayOrders.length > 0 ? (
          <div style={{ ...S.statRow, marginBottom: 12 }}>
            <div style={S.statCard}><div style={S.statNum}>{fmt(rev)}</div><div style={S.statLabel}>売上</div></div>
            <div style={S.statCard}><div style={S.statNum}>{cnt}件</div><div style={S.statLabel}>注文数</div></div>
            <div style={S.statCard}><div style={S.statNum}>{fmt(avg)}</div><div style={S.statLabel}>客単価</div></div>
            <div style={S.statCard}><div style={S.statNum}>{uni}組</div><div style={S.statLabel}>来客数</div></div>
          </div>
        ) : (
          <div style={{ background: "#1a1208", border: "1px solid #2a2010", borderRadius: 10, padding: 14, marginBottom: 12, fontSize: 13, color: "#666", textAlign: "center" }}>
            {selectedDate} の注文データがありません
          </div>
        );
      })()}

      {/* 生成ボタン */}
      <button
        style={{ ...S.btnGold, background: loading ? "#1a1208" : "linear-gradient(135deg,#7b5ea7,#5b3d8f)", color: loading ? "#555" : "#fff", border: loading ? "1px solid #2a2010" : "none", cursor: loading ? "default" : "pointer", marginBottom: 14, fontSize: 15 }}
        onClick={generate} disabled={loading}
      >
        {loading ? "⏳ AIが分析中..." : "🤖 改善レポートを生成する"}
      </button>

      {/* ローディングアニメ */}
      {loading && (
        <div style={{ background: "#1a1208", border: "1px solid #2a2010", borderRadius: 12, padding: 20, textAlign: "center", marginBottom: 14 }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>🧠</div>
          <div style={{ fontSize: 13, color: "#888", lineHeight: 1.8 }}>
            売上データを分析中...<br />
            メニュー構成・客単価・リピート率を評価しています
          </div>
        </div>
      )}

      {/* レポート表示 */}
      {displayReport && !loading && (
        <div style={{ background: "#1a1208", border: "1.5px solid #7b5ea7", borderRadius: 14, padding: 16, marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div>
              <span style={{ fontSize: 12, color: "#7b5ea7", fontWeight: "bold" }}>📅 {displayReport.date} のレポート</span>
              <div style={{ fontSize: 10, color: "#555", marginTop: 2 }}>
                生成: {new Date(displayReport.generatedAt).toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
            {viewSaved && (
              <button style={{ background: "transparent", border: "1px solid #3a2e18", borderRadius: 6, color: "#888", fontSize: 11, padding: "4px 8px", cursor: "pointer" }} onClick={() => setViewSaved(null)}>
                閉じる
              </button>
            )}
          </div>
          <div>{renderReport(displayReport.text)}</div>
        </div>
      )}

      {/* 過去レポート */}
      {savedReports.length > 0 && (
        <div>
          <div style={{ fontSize: 13, fontWeight: "bold", color: "#888", marginBottom: 8 }}>📁 過去のレポート</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {savedReports.map(r => (
              <button key={r.id}
                style={{ background: viewSaved?.id === r.id ? "#2a1f3a" : "#1a1208", border: `1px solid ${viewSaved?.id === r.id ? "#7b5ea7" : "#2a2010"}`, borderRadius: 10, padding: "10px 14px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", textAlign: "left" }}
                onClick={() => { setViewSaved(viewSaved?.id === r.id ? null : r); setReport(null); }}
              >
                <div>
                  <div style={{ fontSize: 13, color: "#e8dcc8", fontWeight: "bold" }}>{r.date}</div>
                  <div style={{ fontSize: 11, color: "#666", marginTop: 2 }}>
                    {new Date(r.generatedAt).toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })} 生成
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 13, color: "#c8a96e", fontWeight: "bold" }}>{fmt(r.revenue)}</div>
                  <div style={{ fontSize: 10, color: "#7b5ea7", marginTop: 2 }}>タップで表示</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================
// スタイル
// =============================================
const S = {
  root: { minHeight: "100vh", background: "#0d0a06", color: "#e8dcc8", fontFamily: "'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif", maxWidth: 480, margin: "0 auto", paddingBottom: 30 },
  header: { background: "linear-gradient(135deg,#1a1208,#2d1f0a)", borderBottom: "2px solid #c8a96e", padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" },
  logo: { fontSize: 15, fontWeight: "bold", color: "#c8a96e", letterSpacing: 1 },
  closeBtn: { background: "#2d0d0d", border: "1.5px solid #c0392b", borderRadius: 8, color: "#c0392b", fontSize: 12, padding: "5px 10px", cursor: "pointer", fontWeight: "bold" },
  nav: { display: "flex", background: "#110e07", borderBottom: "1px solid #2a2010", position: "sticky", top: 0, zIndex: 100 },
  navBtn: { flex: 1, padding: "8px 2px", background: "transparent", border: "none", color: "#666", fontSize: 10, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, borderTop: "2px solid transparent" },
  navActive: { color: "#c8a96e", borderTopColor: "#c8a96e", background: "rgba(200,169,110,0.08)" },
  tableGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 },
  tableCard: { background: "#1a1208", border: "1.5px solid #2a2010", borderRadius: 12, padding: 12, cursor: "pointer" },
  tableCardTop: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  tableName: { fontSize: 16, fontWeight: "bold", color: "#e8dcc8" },
  tableBadge: { fontSize: 10, padding: "2px 7px", borderRadius: 10 },
  tableSeats: { fontSize: 11, color: "#666" },
  tableElapsed: { fontSize: 11, color: "#888", marginTop: 2 },
  tableCustomer: { fontSize: 11, color: "#c8a96e", marginTop: 2 },
  addTableBtn: { background: "#1a1208", border: "1.5px dashed #3a2e18", borderRadius: 12, padding: 12, cursor: "pointer", color: "#555", fontSize: 14, textAlign: "center" },
  orderHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "#1a1208", borderBottom: "1px solid #2a2010", position: "sticky", top: 0, zIndex: 50 },
  backBtn: { background: "transparent", border: "none", color: "#c8a96e", fontSize: 13, cursor: "pointer", padding: "4px 8px" },
  subTabBar: { display: "flex", background: "#110e07", borderBottom: "1px solid #2a2010" },
  subTab: { flex: 1, padding: "10px", background: "transparent", border: "none", color: "#666", fontSize: 13, cursor: "pointer", borderBottom: "2px solid transparent", position: "relative" },
  subTabActive: { color: "#c8a96e", borderBottomColor: "#c8a96e" },
  cartCount: { background: "#c8a96e", color: "#0d0a06", borderRadius: 10, padding: "1px 5px", fontSize: 10, fontWeight: "bold", marginLeft: 4 },
  catBar: { display: "flex", gap: 6, padding: "10px 12px", overflowX: "auto", background: "#110e07", borderBottom: "1px solid #2a2010" },
  catBtn: { whiteSpace: "nowrap", padding: "6px 12px", borderRadius: 20, border: "1.5px solid #3a2e18", background: "#1a1208", color: "#c8a96e", fontSize: 12, cursor: "pointer", fontWeight: "bold" },
  menuGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, padding: "10px 12px" },
  menuItem: { position: "relative", padding: "10px 8px", background: "#1a1208", border: "1.5px solid #2a2010", borderRadius: 10, cursor: "pointer", textAlign: "left", display: "flex", flexDirection: "column", gap: 3 },
  menuName: { fontSize: 13, fontWeight: "bold", color: "#e8dcc8" },
  menuUnit: { fontSize: 10, color: "#888" },
  menuPrice: { fontSize: 14, fontWeight: "bold" },
  badge: { position: "absolute", top: 6, right: 6, background: "#c8a96e", color: "#0d0a06", borderRadius: "50%", width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: "bold" },
  cartBox: { margin: "0 12px 12px", background: "#1a1208", border: "1px solid #2a2010", borderRadius: 12, padding: 12 },
  cartTitle: { fontWeight: "bold", fontSize: 14, color: "#c8a96e", marginBottom: 8 },
  cartRow: { display: "flex", alignItems: "center", gap: 6, marginBottom: 8 },
  cartName: { flex: 1, fontSize: 13 },
  qtyRow: { display: "flex", alignItems: "center", gap: 4 },
  qBtn: { width: 28, height: 28, borderRadius: 6, border: "1px solid #3a2e18", background: "#2a1f0d", color: "#c8a96e", fontSize: 16, cursor: "pointer" },
  qNum: { width: 20, textAlign: "center", fontSize: 14, fontWeight: "bold" },
  cartPrice: { fontSize: 13, fontWeight: "bold", color: "#c8a96e", minWidth: 60, textAlign: "right" },
  histSection: { fontSize: 13, fontWeight: "bold", color: "#c8a96e", marginBottom: 8, marginTop: 4 },
  orderRow: { borderRadius: 10, padding: "10px 12px", marginBottom: 8, border: "1px solid #2a2010" },
  orderRowTop: { display: "flex", alignItems: "center", gap: 6, marginBottom: 4 },
  orderItemName: { flex: 1, fontSize: 14, fontWeight: "bold" },
  orderItemQty: { color: "#888", fontSize: 13 },
  orderItemPrice: { fontSize: 13, fontWeight: "bold", color: "#c8a96e" },
  orderNote: { fontSize: 11, color: "#888", marginBottom: 4 },
  orderMeta: { fontSize: 10, color: "#666", marginBottom: 6 },
  orderActions: { display: "flex", gap: 6 },
  actionBtn: { flex: 1, padding: "6px", background: "#1a1208", border: "1px solid #3a2e18", borderRadius: 6, color: "#e07b4a", fontSize: 11, cursor: "pointer" },
  kitchenCard: { border: "1.5px solid", borderRadius: 12, padding: 12, marginBottom: 10 },
  kitchenTop: { display: "flex", justifyContent: "space-between", marginBottom: 4 },
  kitchenTable: { fontWeight: "bold", fontSize: 14 },
  kitchenTime: { fontSize: 11, color: "#888" },
  kitchenItemName: { fontSize: 18, fontWeight: "bold", marginBottom: 4 },
  customerCard: { background: "#1a1208", border: "1.5px solid #2a2010", borderRadius: 10, padding: 12, cursor: "pointer" },
  rankBadge: { fontSize: 10, padding: "2px 7px", borderRadius: 10, color: "#fff", marginLeft: 6 },
  statRow: { display: "flex", gap: 8 },
  statCard: { flex: 1, background: "#1a1208", border: "1px solid #2a2010", borderRadius: 10, padding: "10px 6px", textAlign: "center" },
  statNum: { fontSize: 15, fontWeight: "bold", color: "#c8a96e" },
  statLabel: { fontSize: 10, color: "#888", marginTop: 2 },
  chartCard: { background: "#1a1208", border: "1px solid #2a2010", borderRadius: 10, padding: 12, marginBottom: 12, marginTop: 12 },
  chartTitle: { fontSize: 13, fontWeight: "bold", color: "#c8a96e", marginBottom: 10 },
  input: { width: "100%", padding: "10px 12px", background: "#110e07", border: "1px solid #3a2e18", borderRadius: 8, color: "#e8dcc8", fontSize: 14, boxSizing: "border-box" },
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 16 },
  modal: { background: "#1a1208", border: "1.5px solid #c8a96e", borderRadius: 16, padding: 20, width: "100%", maxWidth: 360 },
  modalTitle: { fontSize: 16, fontWeight: "bold", color: "#c8a96e", marginBottom: 12 },
  modalBtns: { display: "flex", gap: 8, marginTop: 12 },
  btnGold: { flex: 2, padding: "12px", background: "linear-gradient(135deg,#c8a96e,#a0793a)", border: "none", borderRadius: 8, color: "#0d0a06", fontSize: 14, fontWeight: "bold", cursor: "pointer", width: "100%", textAlign: "center" },
  btnGray: { flex: 1, padding: "12px", background: "#2a2010", border: "none", borderRadius: 8, color: "#888", fontSize: 14, cursor: "pointer" },
  formLabel: { fontSize: 12, color: "#888", marginBottom: 4 },
};
