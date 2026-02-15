// --- 初期設定とデータ読み込み ---
let history = JSON.parse(localStorage.getItem('shopping_history')) || [];
let budgets = JSON.parse(localStorage.getItem('shopping_budgets')) || {};

// API設定 (Google AI Studioで取得したキーを入れてください)
const GEMINI_API_KEY = 'AIzaSyCojvhNkbSbNq9-RgJXK7GVyB0djcJpB_g'; 
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

// スライダーの数値表示
const updateValue = (id, value) => document.getElementById(id).innerText = value;
document.getElementById('frequency').oninput = e => updateValue('frequencyValue', e.target.value);
document.getElementById('desire').oninput = e => updateValue('desireValue', e.target.value);

// --- AI判定メインロジック ---
async function judgeWithAI() {
    const name = document.getElementById('itemName').value || "無名の商品";
    const priceStr = document.getElementById('price').value.replace(/[^0-9]/g, '');
    const price = parseInt(priceStr) || 0;
    const freq = document.getElementById('frequency').value;
    const desire = document.getElementById('desire').value;
    const category = document.getElementById('category').options[document.getElementById('category').selectedIndex].text;
    const regret = document.getElementById('regret').options[document.getElementById('regret').selectedIndex].text;

    if (price === 0) { alert("価格を入力してください"); return; }

    // UI更新（ローディング開始）
    const btn = document.getElementById('judgeBtn');
    const loading = document.getElementById('loading');
    const resultDiv = document.getElementById('result');
    btn.disabled = true;
    loading.style.display = "block";
    resultDiv.style.display = "none";

    // プロンプト作成
    const prompt = `あなたは「買い物判断のプロ」です。以下の情報を分析し、この買い物に「納得スコア（0〜100点）」をつけてください。また、ユーザーの背中を押す、あるいは冷静にさせるアドバイスを100文字以内で作成してください。
    【商品情報】
    商品名: ${name}
    価格: ${price}円
    月間使用頻度: ${freq}回
    本人の欲しさ: ${desire}/100
    カテゴリ: ${category}
    過去の買い物傾向: ${regret}

    出力は必ず以下のJSON形式のみで返してください。
    {"score": 数値, "message": "アドバイス内容"}`;

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const data = await response.json();
        const aiResponseRaw = data.candidates[0].content.parts[0].text;
        
        // JSON抽出（AIが前後にテキストを付けても大丈夫なように）
        const jsonMatch = aiResponseRaw.match(/\{.*\}/s);
        const result = JSON.parse(jsonMatch[0]);

        // 結果を表示
        displayAIResult(name, price, result.score, result.message);

    } catch (error) {
        console.error("AI判定エラー:", error);
        alert("AIとの通信に失敗しました。APIキーを確認するか、時間をおいて試してください。");
    } finally {
        btn.disabled = false;
        loading.style.display = "none";
    }
}

function displayAIResult(name, price, score, message) {
    const resultDiv = document.getElementById('result');
    resultDiv.style.display = "block";
    
    let color = score >= 70 ? "#2ecc71" : (score >= 40 ? "#f1c40f" : "#e74c3c");
    
    resultDiv.innerHTML = `
        <h3 style="color:${color}">納得スコア: ${score}点</h3>
        <p style="background:#f9f9f9; padding:10px; border-radius:8px; font-size:14px; color:#555;">
            <strong>AIのアドバイス:</strong><br>${message}
        </p>
        <div style="display:flex; gap:10px; margin-top:10px;">
            <button onclick="addHistory('${name}', ${price}, ${score}, true)" style="flex:1; background:#2ecc71; color:white; border:none; padding:12px; border-radius:8px; cursor:pointer; font-weight:bold;">購入した</button>
            <button onclick="addHistory('${name}', ${price}, ${score}, false)" style="flex:1; background:#3498db; color:white; border:none; padding:12px; border-radius:8px; cursor:pointer; font-weight:bold;">我慢した</button>
        </div>
    `;
    resultDiv.scrollIntoView({ behavior: 'smooth' });
}

// --- 履歴・予算管理 ---
function addHistory(name, price, score, purchased) {
    const date = new Date();
    const item = { name, price, score, purchased, date: date.toISOString() };
    history.unshift(item);
    localStorage.setItem('shopping_history', JSON.stringify(history));
    document.getElementById('result').style.display = "none";
    renderHistory();
}

function updateBudget() {
    const input = document.getElementById('budgetInput');
    const monthSelector = document.getElementById('monthSelector');
    const budget = parseInt(input.value.replace(/[^0-9]/g, '')) || 0;
    
    if (budget <= 0) { alert("有効な予算を入力してください"); return; }
    
    const month = monthSelector.value || new Date().toISOString().slice(0, 7);
    budgets[month] = budget;
    localStorage.setItem('shopping_budgets', JSON.stringify(budgets));
    
    input.value = "";
    renderHistory();
    alert("予算を登録しました！");
}

function renderHistory() {
    const historyDiv = document.getElementById('history');
    const monthSelector = document.getElementById('monthSelector');
    
    let currentMonth = monthSelector.value || new Date().toISOString().slice(0, 7);
    
    // 月リストの作成
    const months = [...new Set(history.map(h => h.date.slice(0, 7)))];
    if (!months.includes(new Date().toISOString().slice(0, 7))) months.push(new Date().toISOString().slice(0, 7));
    months.sort().reverse();
    monthSelector.innerHTML = months.map(m => `<option value="${m}" ${m === currentMonth ? 'selected' : ''}>${m}</option>`).join('');

    let total = 0, allSavings = 0;
    historyDiv.innerHTML = "";

    history.forEach((item, index) => {
        if (!item.purchased) allSavings += item.price;
        
        if (item.date.slice(0, 7) === currentMonth) {
            if (item.purchased) total += item.price;
            const card = document.createElement('div');
            card.className = "history-item";
            card.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <strong>${item.name}</strong>
                    <span>${item.purchased ? '✅' : '💧'}</span>
                </div>
                <div style="font-size:12px; color:#666;">
                    ${item.price.toLocaleString()}円 | スコア: ${item.score}点
                </div>
                <button onclick="deleteItem(${index})" style="background:none; border:none; color:#e74c3c; font-size:11px; padding:0; cursor:pointer; text-decoration:underline;">削除</button>
            `;
            historyDiv.appendChild(card);
        }
    });

    document.getElementById('totalAmount').innerText = total.toLocaleString() + "円";
    document.getElementById('totalSavings').innerText = allSavings.toLocaleString() + "円";
    document.getElementById('displayBudget').innerText = (budgets[currentMonth] || 0).toLocaleString() + "円";

    const msg = document.getElementById('budgetMessage');
    const budget = budgets[currentMonth] || 0;
    if (budget > 0) {
        const diff = budget - total;
        msg.innerHTML = diff >= 0 ? `あと <strong>${diff.toLocaleString()}円</strong>` : `<span style="color:#e63946">超過: ${Math.abs(diff).toLocaleString()}円</span>`;
    } else {
        msg.innerText = "予算未設定";
    }
}

function deleteItem(index) {
    if(confirm("この履歴を削除しますか？")) {
        history.splice(index, 1);
        localStorage.setItem('shopping_history', JSON.stringify(history));
        renderHistory();
    }
}

// --- バックアップ機能 ---
function exportData() {
    const data = { history, budgets };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `buy_support_backup_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function importData(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = event => {
        try {
            const data = JSON.parse(event.target.result);
            if (data.history) {
                history = data.history;
                localStorage.setItem('shopping_history', JSON.stringify(history));
            }
            if (data.budgets) {
                budgets = data.budgets;
                localStorage.setItem('shopping_budgets', JSON.stringify(budgets));
            }
            alert("データを復元しました！");
            renderHistory();
        } catch(err) {
            alert("ファイル形式が正しくありません");
        }
    };
    reader.readAsText(file);
    e.target.value = ""; // リセット
}

window.onload = renderHistory;
