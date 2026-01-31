const frequency = document.getElementById("frequency");
const desire = document.getElementById("desire");
const budgetInput = document.getElementById("budgetInput");
const monthSelector = document.getElementById("monthSelector");

function init() {
  const now = new Date();
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const mStr = `${d.getFullYear()}/${d.getMonth() + 1}`;
    const opt = document.createElement("option");
    opt.value = mStr;
    opt.textContent = mStr + " の記録";
    monthSelector.appendChild(opt);
  }
  renderHistory();
}

frequency.oninput = () => document.getElementById("frequencyValue").textContent = frequency.value;
desire.oninput = () => document.getElementById("desireValue").textContent = desire.value;

function updateBudget() { renderHistory(); }

function normalizePrice(val) {
  if (!val) return 0;
  return Number(val.toString().replace(/[０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 65248)).replace(/,/g, ""));
}

function getHistory() {
  return JSON.parse(localStorage.getItem("judgeHistory") || "[]");
}

function renderHistory() {
  const history = getHistory();
  const area = document.getElementById("history");
  const totalArea = document.getElementById("totalAmount");
  const savingArea = document.getElementById("totalSavings"); // 🌟 追加
  const msgArea = document.getElementById("budgetMessage");
  const selectedMonth = monthSelector.value;
  
  area.innerHTML = "";
  let total = 0;
  let savings = 0; // 🌟 追加

  history.forEach((item, index) => {
    // 全期間の「買わなかった」を節約額として合計
    if (item.bought === '買わなかった') savings += item.price;

    const d = new Date(item.date);
    const mStr = `${d.getFullYear()}/${d.getMonth() + 1}`;

    if (mStr === selectedMonth) {
      if (item.bought === '買った') total += item.price;

      area.innerHTML += `
        <div class="history-item">
          <small>${item.date} | ${item.result}</small><br>
          <strong>${item.itemName}</strong> (${item.price.toLocaleString()}円)<br>
          <button style="background:${item.bought==='買った'?'#2e7d32':'#4caf50'}" onclick="setBought(${index}, '買った')">${item.bought==='買った'?'✅ 済':'買った'}</button>
          <button style="background:${item.bought==='買わなかった'?'#757575':'#aaa'}" onclick="setBought(${index}, '買わなかった')">${item.bought==='買わなかった'?'✨ 我慢した':'やめた'}</button>
        </div>
      `;
    }
  });

  totalArea.textContent = `${total.toLocaleString()}円`;
  savingArea.textContent = `${savings.toLocaleString()}円`; // 🌟 反映
  
  const budget = normalizePrice(budgetInput.value);
  if (budget > 0 && total > budget) {
    totalArea.classList.add("over-budget");
    msgArea.innerHTML = `<span style="color:red; font-size:12px;">⚠️ 予算を${(total - budget).toLocaleString()}円超過</span>`;
  } else {
    totalArea.classList.remove("over-budget");
    msgArea.textContent = "";
  }
}

function setBought(index, val) {
  const history = getHistory();
  history[index].bought = val;
  if(val === '買わなかった') alert("ナイス判断！そのお金を他のことに使えますね✨");
  localStorage.setItem("judgeHistory", JSON.stringify(history));
  renderHistory();
}

function judge() {
  const name = document.getElementById("itemName").value.trim();
  const price = normalizePrice(document.getElementById("price").value);
  if (!name || !price) return alert("入力してね！");

  const valScore = (Number(desire.value) * 1.2 + Number(frequency.value) * 4) * Number(document.getElementById("category").value) * Number(document.getElementById("regret").value);
  const costScore = Math.log10(price) * 22;
  const score = valScore - costScore;

  let res, detail;
  if (score >= 40) { res = "買ってヨシ！"; detail = "✨ 良い買い物になりそうです！"; }
  else if (score >= 18) { res = "迷い中..."; detail = "🤔 あと数日考えてみましょう。"; }
  else { res = "ガマン！"; detail = "🛑 衝動買いの可能性あり。"; }

  const resArea = document.getElementById("result");
  resArea.style.display = "block";
  resArea.innerHTML = `判定：<strong>${res}</strong><br><small>${detail}</small>`;
  
  const history = getHistory();
  history.unshift({ date: new Date().toLocaleDateString(), itemName: name, price, result: res, bought: null });
  localStorage.setItem("judgeHistory", JSON.stringify(history));
  renderHistory();
}

// ... 以下 exportData, importData は同じなので省略
init();
