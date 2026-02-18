// --- 初期データ読み込み ---
let historyData = JSON.parse(localStorage.getItem('shopping_history')) || [];
let budgets = JSON.parse(localStorage.getItem('shopping_budgets')) || {};

const KEY_PART_A = "AIzaSyDhFYut_";
const KEY_PART_B = "ggRtfESz4tDjVvbTFLVDgaCTIk"; 
const GEMINI_API_KEY = KEY_PART_A + KEY_PART_B;
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

document.addEventListener('DOMContentLoaded', () => {
    // スライダー
    document.getElementById('frequency').oninput = e => document.getElementById('frequencyValue').innerText = e.target.value;
    document.getElementById('desire').oninput = e => document.getElementById('desireValue').innerText = e.target.value;
    
    initMonthSelector(); // 月リスト作成
    renderHistory();     // 初回描画
});

// 月選択プルダウンを生成 (現在から半年分)
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

// AI判定
async function judgeWithAI() {
    const name = document.getElementById('itemName').value || "商品";
    const price = parseInt(document.getElementById('price').value.replace(/[^0-9]/g, '')) || 0;
    if (price === 0) { alert("価格を入れてください"); return; }

    const btn = document.getElementById('judgeBtn');
    const loading = document.getElementById('loading');
    btn.disabled = true;
    loading.style.display = "block";

    const prompt = `あなたは買い物プロAI 2.5です。以下を分析し{"score":数値, "message":"100字以内の助言"}をJSONで返して。
    商品:${name},価格:${price}円,月頻度:${document.getElementById('frequency').value},欲しさ:${document.getElementById('desire').value}/100`;

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        const data = await response.json();
        const resText = data.candidates[0].content.parts[0].text;
        const result = JSON.parse(resText.match(/\{.*\}/s)[0]);
        
        showResult(name, price, result.score, result.message);
    } catch (e) {
        alert("AI通信エラー");
    } finally {
        btn.disabled = false;
        loading.style.display = "none";
    }
}

function showResult(name, price, score, message) {
    const resDiv = document.getElementById('result');
    resDiv.style.display = "block";
    const color = score >= 70 ? "#2ecc71" : "#e74c3c";
    resDiv.innerHTML = `
        <h3 style="color:${color}">AI判定: ${score}点</h3>
        <p>${message}</p>
        <button onclick="addHistory('${name}', ${price}, ${score}, true)" style="background:#2ecc71; color:white; padding:10px; border:none; border-radius:5px; cursor:pointer;">購入する</button>
        <button onclick="addHistory('${name}', ${price}, ${score}, false)" style="background:#3498db; color:white; padding:10px; border:none; border-radius:5px; cursor:pointer; margin-left:10px;">我慢する</button>
    `;
}

// 履歴追加
function addHistory(name, price, score, isPurchased) {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    const item = {
        name, price, score, isPurchased,
        month: currentMonth,
        date: now.toLocaleString()
    };
    
    historyData.unshift(item);
    localStorage.setItem('shopping_history', JSON.stringify(historyData));
    
    // プルダウンを現在の月に戻して描画
    document.getElementById('monthSelector').value = currentMonth;
    document.getElementById('result').style.display = "none";
    renderHistory();
}

// 予算登録
function updateBudget() {
    const month = document.getElementById('monthSelector').value;
    const val = parseInt(document.getElementById('budgetInput').value) || 0;
    budgets[month] = val;
    localStorage.setItem('shopping_budgets', JSON.stringify(budgets));
    renderHistory();
}

// ★最重要：履歴リストの描画
function renderHistory() {
    const targetMonth = document.getElementById('monthSelector').value; // プルダウンで選ばれている月
    document.getElementById('historyMonthDisplay').innerText = targetMonth;
    
    const listDiv = document.getElementById('history');
    const totalDisp = document.getElementById('totalAmount');
    const budgetDisp = document.getElementById('displayBudget');
    const savingDisp = document.getElementById('totalSavings');

    listDiv.innerHTML = "";
    let monthlyTotal = 0;
    let allTimeSaved = 0;

    // データのフィルタリング
    historyData.forEach((item, index) => {
        // 1. 累計節約額の計算（月に関係なく「我慢」した全合計）
        if (!item.isPurchased) {
            allTimeSaved += item.price;
        }

        // 2. 選択された月のデータのみ表示
        if (item.month === targetMonth) {
            const row = document.createElement('div');
            row.style = "padding:10px; border-bottom:1px solid #eee; display:flex; justify-content:space-between; align-items:center; background:white; margin-bottom:5px; border-radius:8px;";
            row.innerHTML = `
                <div>
                    <strong>${item.name}</strong> <small style="color:#999;">${item.score}点</small><br>
                    <span style="color:${item.isPurchased ? '#e74c3c' : '#2ecc71'}; font-size:12px;">
                        ${item.isPurchased ? '💰購入' : '🌿我慢'}: ${item.price.toLocaleString()}円
                    </span>
                </div>
                <button onclick="deleteItem(${index})" style="background:none; border:none; color:#ccc; cursor:pointer;">✕</button>
            `;
            listDiv.appendChild(row);

            // 月の合計出費を加算
            if (item.isPurchased) {
                monthlyTotal += item.price;
            }
        }
    });

    // 画面表示の更新
    totalDisp.innerText = `${monthlyTotal.toLocaleString()}円`;
    savingDisp.innerText = `${allTimeSaved.toLocaleString()}円`;
    budgetDisp.innerText = `${(budgets[targetMonth] || 0).toLocaleString()}円`;
}

function deleteItem(index) {
    if(confirm("削除しますか？")) {
        historyData.splice(index, 1);
        localStorage.setItem('shopping_history', JSON.stringify(historyData));
        renderHistory();
    }
}

// バックアップ系
function exportData() {
    const blob = new Blob([JSON.stringify({historyData, budgets})], {type: 'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'haidan_backup.json';
    a.click();
}

function importData(e) {
    const reader = new FileReader();
    reader.onload = (event) => {
        const d = JSON.parse(event.target.result);
        historyData = d.historyData || [];
        budgets = d.budgets || {};
        localStorage.setItem('shopping_history', JSON.stringify(historyData));
        localStorage.setItem('shopping_budgets', JSON.stringify(budgets));
        renderHistory();
    };
    reader.readAsText(e.target.files[0]);
}
