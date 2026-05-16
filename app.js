// app.js

document.addEventListener('DOMContentLoaded', () => {
  // === DOM 要素の取得 ===
  const registerForm = document.getElementById('register-form');
  const inputFront = document.getElementById('input-front');
  const inputBack = document.getElementById('input-back');
  const bulkRegisterForm = document.getElementById('bulk-register-form');
  const inputBulk = document.getElementById('input-bulk');
  const wordListEl = document.getElementById('word-list');
  const wordCountEl = document.getElementById('word-count');
  const overallStatsEl = document.getElementById('overall-stats');
  
  const navItems = document.querySelectorAll('.nav-item');
  const views = document.querySelectorAll('.view');
  
  const studyEmpty = document.getElementById('study-empty');
  const studyArea = document.getElementById('study-area');
  const studyCard = document.getElementById('study-card');
  const cardFrontText = document.getElementById('card-front-text');
  const cardBackText = document.getElementById('card-back-text');
  const studyCurrent = document.getElementById('study-current');
  const studyTotal = document.getElementById('study-total');
  
  const studyNavControls = document.getElementById('study-nav-controls');
  const studyAssessControls = document.getElementById('study-assess-controls');
  const btnPrev = document.getElementById('btn-prev');
  const btnNext = document.getElementById('btn-next');
  const btnCorrect = document.getElementById('btn-correct');
  const btnIncorrect = document.getElementById('btn-incorrect');

  // === 状態管理 ===
  let words = [];
  let currentStudyIndex = 0;

  // === 初期化処理 ===
  init();

  function init() {
    loadData();
    renderList();
    setupEventListeners();
  }

  // === データ管理 (LocalStorage) ===
  function loadData() {
    const saved = localStorage.getItem('flashcards_data');
    if (saved) {
      try {
        words = JSON.parse(saved);
      } catch (e) {
        words = [];
      }
    }
  }

  function saveData() {
    localStorage.setItem('flashcards_data', JSON.stringify(words));
  }

  // === イベントリスナー設定 ===
  function setupEventListeners() {
    // 画面切り替え (Bottom Navigation)
    navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        const targetId = e.currentTarget.dataset.target;
        switchView(targetId);
      });
    });

    // 登録フォーム送信
    registerForm.addEventListener('submit', (e) => {
      e.preventDefault();
      addWord();
    });

    // 一括登録フォーム送信
    bulkRegisterForm.addEventListener('submit', (e) => {
      e.preventDefault();
      addBulkWords();
    });

    // カードのフリップ（裏表切り替え）とボタンの表示切り替え
    studyCard.addEventListener('click', () => {
      const isFlipped = studyCard.classList.toggle('is-flipped');
      if (isFlipped) {
        studyNavControls.classList.add('hidden');
        studyAssessControls.classList.remove('hidden');
      } else {
        studyNavControls.classList.remove('hidden');
        studyAssessControls.classList.add('hidden');
      }
    });

    // 学習モードのナビゲーション
    btnNext.addEventListener('click', () => navigateStudy(1));
    btnPrev.addEventListener('click', () => navigateStudy(-1));

    // 判定ボタン
    btnCorrect.addEventListener('click', (e) => {
      e.stopPropagation(); // 親要素（カード）のクリックイベントを発火させない
      assessWord('correct');
    });
    btnIncorrect.addEventListener('click', (e) => {
      e.stopPropagation();
      assessWord('incorrect');
    });
  }

  // === ビューの切り替え ===
  function switchView(targetId) {
    // ナビゲーションのアクティブ状態切り替え
    navItems.forEach(item => {
      item.classList.toggle('active', item.dataset.target === targetId);
    });

    // 画面コンテンツのアクティブ状態切り替え
    views.forEach(view => {
      view.classList.toggle('active', view.id === targetId);
    });

    // 学習画面に切り替わったときの初期化
    if (targetId === 'view-study') {
      initStudySession();
    }
  }

  // === 登録・一覧機能 ===
  function addWord() {
    const frontText = inputFront.value.trim();
    const backText = inputBack.value.trim();

    if (!frontText || !backText) return;

    const newWord = {
      id: Date.now().toString(),
      front: frontText,
      back: backText,
      history: [],
      createdAt: new Date().toISOString()
    };

    words.push(newWord);
    saveData();
    
    // フォームリセット
    inputFront.value = '';
    inputBack.value = '';
    inputFront.focus();

    renderList();
  }

  function addBulkWords() {
    const text = inputBulk.value.trim();
    if (!text) return;

    const lines = text.split('\n');
    let addedCount = 0;

    lines.forEach(line => {
      // カンマまたはタブで分割
      const parts = line.split(/[,\t]/);
      if (parts.length >= 2) {
        const frontText = parts[0].trim();
        const backText = parts.slice(1).join(',').trim(); // 答えにカンマが含まれる場合を考慮

        if (frontText && backText) {
          words.push({
            id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
            front: frontText,
            back: backText,
            history: [],
            createdAt: new Date().toISOString()
          });
          addedCount++;
        }
      }
    });

    if (addedCount > 0) {
      saveData();
      inputBulk.value = '';
      renderList();
      alert(`${addedCount}件の単語を一括登録しました！`);
    } else {
      alert('登録できる単語が見つかりませんでした。「問題,答え」の形式で入力してください。');
    }
  }

  function deleteWord(id) {
    if(confirm('この単語を削除しますか？')) {
      words = words.filter(w => w.id !== id);
      saveData();
      renderList();
    }
  }

  // グローバルに関数を公開（HTMLのインラインonclickから呼ぶため）
  window.deleteWord = deleteWord;

  function renderList() {
    wordCountEl.textContent = words.length;

    // 全体の正答率を計算（各単語の「直近の成績」のみで計算）
    let studiedWordsCount = 0;
    let correctWordsCount = 0;
    
    words.forEach(w => {
      const hist = w.history || [];
      if (hist.length > 0) {
        studiedWordsCount++;
        // 直近の成績が 'correct' かどうか
        const latestResult = hist[hist.length - 1].result;
        if (latestResult === 'correct') {
          correctWordsCount++;
        }
      }
    });

    if (studiedWordsCount > 0) {
      const overallRate = Math.round((correctWordsCount / studiedWordsCount) * 100);
      overallStatsEl.innerHTML = `
        <span>全体の正答率</span>
        <span class="rate">🎯 ${overallRate}% <span style="font-size: 0.8rem; color: var(--text-secondary);">(${studiedWordsCount}問中${correctWordsCount}問正解)</span></span>
      `;
      overallStatsEl.style.display = 'flex';
    } else {
      overallStatsEl.style.display = 'none';
    }

    wordListEl.innerHTML = '';

    // 新しいものが上にくるように逆順で表示
    [...words].reverse().forEach(word => {
      const hist = word.history || [];
      const recentDots = hist.slice(-5).map(h => h.result === 'correct' ? '⭕️' : '❌').join('');
      
      const statHtml = hist.length > 0 
        ? `<span class="history-dots">${recentDots}</span>`
        : `<span class="stat-badge">未学習</span>`;

      const li = document.createElement('li');
      li.className = 'word-item';
      li.innerHTML = `
        <div class="word-texts">
          <div class="word-header">
            <span class="word-front">${escapeHTML(word.front)}</span>
            ${statHtml}
          </div>
          <span class="word-back">${escapeHTML(word.back)}</span>
        </div>
        <button class="btn-delete" onclick="deleteWord('${word.id}')">✖</button>
      `;
      wordListEl.appendChild(li);
    });
  }

  // === 学習機能 ===
  function initStudySession() {
    if (words.length === 0) {
      studyEmpty.classList.remove('hidden');
      studyArea.classList.add('hidden');
      return;
    }

    studyEmpty.classList.add('hidden');
    studyArea.classList.remove('hidden');
    
    // シャッフル機能などはPhase2以降。今は登録順（逆順でもOKだが今回は古い順）で表示
    currentStudyIndex = 0;
    updateStudyCard();
  }

  function updateStudyCard() {
    // カードを一旦表面に戻し、ナビゲーションを通常にする
    studyCard.classList.remove('is-flipped');
    studyNavControls.classList.remove('hidden');
    studyAssessControls.classList.add('hidden');
    
    // アニメーションを待ってからテキスト書き換え
    setTimeout(() => {
      const currentWord = words[currentStudyIndex];
      cardFrontText.textContent = currentWord.front;
      cardBackText.textContent = currentWord.back;
      
      studyCurrent.textContent = currentStudyIndex + 1;
      studyTotal.textContent = words.length;
      
      // ボタンの状態更新
      btnPrev.style.opacity = currentStudyIndex === 0 ? '0.5' : '1';
      btnPrev.style.pointerEvents = currentStudyIndex === 0 ? 'none' : 'auto';
      
      btnNext.style.opacity = currentStudyIndex === words.length - 1 ? '0.5' : '1';
      btnNext.style.pointerEvents = currentStudyIndex === words.length - 1 ? 'none' : 'auto';
    }, 150); // css transitionより短い時間で
  }

  function navigateStudy(direction) {
    const newIndex = currentStudyIndex + direction;
    if (newIndex >= 0 && newIndex < words.length) {
      currentStudyIndex = newIndex;
      updateStudyCard();
    } else if (direction > 0) {
      // 最後のカードで次へ（または判定）を押した場合
      updateStudyCard(); // 状態リセット
      alert('学習完了です！一覧画面で成績を確認してみましょう。');
      switchView('view-list');
    }
  }

  function assessWord(result) {
    const currentWord = words[currentStudyIndex];
    if (!currentWord.history) currentWord.history = []; // 後方互換性
    
    currentWord.history.push({
      date: new Date().toISOString(),
      result: result
    });
    saveData();
    
    // 次のカードへ自動遷移
    navigateStudy(1);
  }

  // === ユーティリティ ===
  function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
      tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag));
  }
});
