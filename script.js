// --- 初期設定とデータ読み込み ---
let history = JSON.parse(localStorage.getItem('shopping_history')) || [];
let budgets = JSON.parse(localStorage.getItem('shopping_budgets')) || {};

// API設定 (2026年最新の2.5モデルを使用)
const KEY_PART_A = "AIzaSyDhFYut_";
const KEY_PART_B = "ggRtfESz4tDjVvbTFLVDgaCTIk"; 
const GEMINI_API_KEY = KEY_PART_A + KEY_PART_B;
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

// ページ読み込み時の処理
document.addEventListener('DOMContentLoaded', () => {
    // スライダーの連動表示
    const freqInput = document.getElementById('frequency');
    const desireInput = document.getElementById('desire');
    if(freqInput) freqInput.oninput = e => document.getElementById('frequencyValue').innerText = e.target.value;
    if(desireInput) desireInput.oninput = e => document.getElementById('desireValue').innerText = e.target.value;
    
    initMonthSelector();
    renderHistory();
});

// 月選択プルダウンの生成
function initMonthSelector() {
    const selector = document.getElementById('monthSelector');
    const now = new Date();
    for (let i = 0; i < 6; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const option = document.createElement('option');
        option.value = m;
        option.innerText = `${d.getFullYear()}年${d.getMonth() + 1}月`;
        selector.appendChild(option);
    }
}

// AI判定メインロジック
async function judgeWithAI() {
    const name = document.getElementById('itemName').value || "無名の商品";
    const price = parseInt(document.getElementById('price').value.replace(/[^0-9]/g, '')) || 0;
    const freq = document.getElementById('frequency').value;
    const desire = document.getElementById('desire').value;
    const cat = document.getElementById('category').options[document.getElementById('category').selectedIndex].text;
    const reg = document.getElementById('regret').options[document.getElementById('regret').selectedIndex].text;

    if (price === 0) { alert("価格を入力してください"); return; }

    const btn = document.getElementById('judgeBtn');
    const loading = document.getElementById('loading');
    const resultDiv = document.getElementById('result');
    
    btn.disabled = true;
    loading.style.display = "block";
    resultDiv.style.display = "none";

    const prompt = `あなたは買い物判断のプロ(AI 2.5)です。以下の情報を分析し、納得スコア(0-100)とアドバイスを100文字以内で作成してください。
    商品:${name} / 価格:${price}円 / 頻度:月${freq}回 / 欲しさ:${desire} / カテゴリ:${cat} / 過去の傾向:${reg}
    出力は必ず以下のJSON形式のみにしてください： {"score": 数値, "message": "内容"}`;

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        const data = await response.json();
        const resText = data.candidates[0].content.parts[0].text;
        const result = JSON.parse(resText.match(/\{.*\}/s)[0]);
        displayAIResult(name, price, result.score, result.message);
    } catch (e) {
        alert("AIとの通信に失敗しました。2026年のAPI仕様を確認してください。");
        console.error(e);
    } finally {
        btn.disabled = false;
        loading.style.display = "none";
    }
}

// 判定結果の表示
function displayAIResult(name, price, score, message) {
    const div = document.getElementById('result');
    div.style.display = "block";
    const color = score >= 70 ? "#2ecc71" : (score >= 40 ? "#f1c40f" : "#e74c3c");
    div.innerHTML = `
        <h3 style="color:${color}">納得スコア: ${score}点</h3>
        <p style="font-size:14px; border-left:4px solid ${color}; padding:10px; background:#f9f9f9; border-radius:4px;">${message}</p>
        <div style="display:flex; gap:10px; margin-top:15px;">
            <button onclick="addHistory('${name}', ${price}, ${score}, true)" style="flex:1; background:#2ecc71; color:white; border:none; padding:12px; border-radius:8px; cursor:pointer; font-weight:bold;">購入を決めた</button>
            <button onclick="addHistory('${name}', ${price}, ${score}, false)" style="flex:1; background:#3498db; color:white; border:none; padding:12px; border-radius:8px; cursor:pointer; font-weight:bold;">今回は我慢</button>
        </div>
    `;
    div.scrollIntoView({ behavior: 'smooth' });
}

// 履歴への追加
function addHistory(name, price, score, isPurchased) {
    const now = new Date();
    const item = {
        name, price, score, isPurchased,
        date: now.toISOString(),
        month: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    };
    history.unshift(item);
    localStorage.setItem('shopping_history', JSON.stringify(history));
    document.getElementById('result').style.display = "none";
    renderHistory();
}

// 予算の更新
function updateBudget() {
    const val = parseInt(document.getElementById('budgetInput').value) || 0;
    const month = document.getElementById('monthSelector').value;
    budgets[month] = val;
    localStorage.setItem('shopping_budgets', JSON.stringify(budgets));
    renderHistory();
}

// 描画処理（履歴・出費・節約額）
function renderHistory() {
    const targetMonth = document.getElementById('monthSelector').value;
    const listDiv = document.getElementById('history');
    const totalAmountDiv = document.getElementById('totalAmount');
    const budgetDisp = document.getElementById('displayBudget');
    const savingDiv = document.getElementById('totalSavings');
    
    listDiv.innerHTML = "";
    let totalSpent = 0;
    let totalSaved = 0;

    history.forEach((item, index) => {
        if (item.month === targetMonth) {
            const div = document.createElement('div');
            div.style = "background:white; border:1px solid #eee; padding:12px; border-radius:10px; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center;";
            div.innerHTML = `
                <div>
                    <span style="font-weight:bold;">${item.name}</span> <span style="font-size:10px; color:#999;">(${item.score}点)</span><br>
                    <small style="color:${item.isPurchased ? '#e74c3c':'#2ecc71'}">${item.isPurchased ? '💰 購入' : '🌿 節約'}: ${item.price.toLocaleString()}円</small>
                </div>
                <button onclick="deleteItem(${index})" style="background:none; border:none; color:#ccc; cursor:pointer; font-size:18px;">&times;</button>
            `;
            listDiv.appendChild(div);
            if (item.isPurchased) totalSpent += item.price;
        }
        if (!item.isPurchased) totalSaved += item.price;
    });

    totalAmountDiv.innerText = `${totalSpent.toLocaleString()}円`;
    savingDiv.innerText = `${totalSaved.toLocaleString()}円`;
    budgetDisp.innerText = `${(budgets[targetMonth] || 0).toLocaleString()}円`;
}

// 削除機能
function deleteItem(index) {
    if(confirm("この履歴を削除しますか？")) {
        history.splice(index, 1);
        localStorage.setItem('shopping_history', JSON.stringify(history));
        renderHistory();
    }
}

// データ管理機能
function exportData() {
    const data = JSON.stringify({history, budgets});
    const blob = new Blob([data], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `buy_support_backup_${new Date().getTime()}.json`;
    a.click();
}

function importData(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const data = JSON.parse(event.target.result);
            history = data.history || [];
            budgets = data.budgets || {};
            localStorage.setItem('shopping_history', JSON.stringify(history));
            localStorage.setItem('shopping_budgets', JSON.stringify(budgets));
            renderHistory();
            alert("バックアップを復元しました");
        } catch (err) { alert("無効なファイルです"); }
    };
    reader.readAsText(file);
}
