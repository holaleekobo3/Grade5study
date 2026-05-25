// quiz-engine.js
// Handles quiz scoring, result display, explanation toggling, and history tracking

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('quizForm');
  const resultBox = document.getElementById('resultBox');

  // Answer key containing all correct answers
  const answerKey = {
    // True/False
    'tf-1': 'O', 'tf-2': 'X', 'tf-3': 'O', 'tf-4': 'X', 'tf-5': 'O',
    // Multiple Choice
    'mc-1': '2', 'mc-2': '4', 'mc-3': '1', 'mc-4': '3', 'mc-5': '3',
    // Matching (select) – period codes
    'mt-1': 'D', 'mt-2': 'B', 'mt-3': 'E', 'mt-4': 'C', 'mt-5': 'A',
    // Checkbox – array of correct values
    'cb': ['1', '2', '4', '5'],
    // Reading comprehension (single‑choice)
    'rd-1': '1', 'rd-2': '2', 'rd-3': '3', 'rd-4': 'O', 'rd-5': 'X'
  };

  const maxScorePer = 4; // each question worth 4 points

  // Load quiz history from localStorage and display the most recent 5 records
  const loadHistory = () => {
    const history = JSON.parse(localStorage.getItem('socialQuizHistory')) || [];
    const tbody = document.querySelector('#historyTable tbody');
    tbody.innerHTML = '';
    if (history.length === 0) {
      tbody.innerHTML = '<tr><td colspan="3">尚無測驗紀錄</td></tr>';
      return;
    }
    history.slice(0, 5).forEach(record => {
      tbody.innerHTML += `<tr><td>${record.date}</td><td>${record.unit}</td><td>${record.score} 分</td></tr>`;
    });
  };

  loadHistory();

  // Helper to show explanation and mark correctness
  const showResult = (key, selected) => {
    const expDiv = document.getElementById(`exp-${key}`);
    if (expDiv) expDiv.style.display = 'block';
    if (selected && selected === answerKey[key]) {
      totalScore += maxScorePer;
      expDiv && expDiv.classList.add('correct-text');
    } else {
      expDiv && expDiv.classList.add('wrong-text');
    }
  };

  // Submit handler
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    totalScore = 0; // reset for this submission

    // True/False questions (radio)
    for (let i = 1; i <= 5; i++) {
      const name = `tf-${i}`;
      const radios = document.getElementsByName(name);
      let selected = null;
      radios.forEach(r => { if (r.checked) selected = r.value; });
      showResult(name, selected);
    }

    // Multiple Choice questions (radio)
    for (let i = 1; i <= 5; i++) {
      const name = `mc-${i}`;
      const radios = document.getElementsByName(name);
      let selected = null;
      radios.forEach(r => { if (r.checked) selected = r.value; });
      showResult(name, selected);
    }

    // Matching (select) questions
    for (let i = 1; i <= 5; i++) {
      const name = `mt-${i}`;
      const select = document.querySelector(`select[name="${name}"]`);
      const selected = select ? select.value : '';
      showResult(name, selected);
    }

    // Checkbox question (multiple correct answers)
    const cbCorrect = answerKey['cb'];
    const cbChecked = [];
    document.querySelectorAll('input[name="cb"]:checked').forEach(cb => cbChecked.push(cb.value));
    const expCb = document.getElementById('exp-cb');
    if (expCb) expCb.style.display = 'block';
    const cbMistakes = cbCorrect.reduce((cnt, val) => cnt + (cbChecked.includes(val) ? 0 : 1), 0) +
                       cbChecked.reduce((cnt, val) => cnt + (cbCorrect.includes(val) ? 0 : 1), 0);
    const cbScore = Math.max(0, 20 - cbMistakes * 4);
    totalScore += cbScore;
    if (cbMistakes === 0) {
      expCb && expCb.classList.add('correct-text');
    } else {
      expCb && expCb.classList.add('wrong-text');
    }

    // Reading comprehension (single‑choice radio)
    for (let i = 1; i <= 5; i++) {
      const name = `rd-${i}`;
      const radios = document.getElementsByName(name);
      let selected = null;
      radios.forEach(r => { if (r.checked) selected = r.value; });
      showResult(name, selected);
    }

    // Show all explanations
    document.querySelectorAll('.explanation').forEach(el => el.style.display = 'block');

    // Highlight select elements based on correctness
    document.querySelectorAll('select').forEach(el => {
      if (el.value === answerKey[el.name]) {
        el.style.backgroundColor = '#c6f6d5'; // correct – light green
      } else {
        el.style.backgroundColor = '#fed7d7'; // incorrect – light red
      }
    });

    // Record result in history
    const now = new Date();
    const record = {
      date: now.toLocaleString('zh-TW'),
      unit: '日治時期的社會變遷',
      score: totalScore
    };
    const history = JSON.parse(localStorage.getItem('socialQuizHistory')) || [];
    history.unshift(record);
    localStorage.setItem('socialQuizHistory', JSON.stringify(history));
    loadHistory();

    // Scroll to top
    window.scrollTo(0, 0);

    // Disable submit button to prevent duplicate submissions
    const submitBtn = document.querySelector('.btn-submit');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerText = '已批改完成，請參閱解析';
    }

    // Display total score (out of 100 for UI consistency)
    resultBox.innerHTML = `您的總分是：<span style="color:var(--danger);">${totalScore}</span> / 100 分`;
    resultBox.style.display = 'block';
    resultBox.scrollIntoView({ behavior: 'smooth' });
  });
});
