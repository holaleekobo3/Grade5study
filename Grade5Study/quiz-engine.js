/**
 * 📚 Grade5Study 統一互動測驗引擎 (quiz-engine.js)
 * 
 * 核心功能：
 * 1. 支援「選擇題 (Multiple Choice)」與「填空題 (Fill in the Blank)」雙模渲染。
 * 2. 支援單一題目列表 (questions) 與分區章節列表 (sections) 結構。
 * 3. 整合 LocalStorage 自動化學習歷程記錄（可紀錄得分與錯題細節）。
 * 4. 內建全域防閃爍「亮色/暗色模式切換」與樣式同步。
 * 5. 動態注入精美的輸入框樣式（.input-box）與作答微動畫，提供 Premium 視覺體驗。
 */

(function () {
    // 1. 驗證配置資料
    if (typeof QUIZ_CONFIG === 'undefined') {
        console.error('Quiz Engine: QUIZ_CONFIG is not defined! Please define quiz parameters.');
        return;
    }

    const CONFIG = QUIZ_CONFIG;
    const STORAGE_KEY = CONFIG.id ? CONFIG.id + '_results' : 'generic_quiz_results';

    // 2. 扁平化所有問題以利索引與評分
    let flatQuizData = [];
    if (CONFIG.questions && Array.isArray(CONFIG.questions)) {
        flatQuizData = CONFIG.questions;
    } else if (CONFIG.sections && Array.isArray(CONFIG.sections)) {
        flatQuizData = CONFIG.sections.reduce((acc, section) => acc.concat(section.questions), []);
    }

    // 3. 動態注入必要的 CSS 樣式（填空題輸入框與動態成效樣式）
    const injectStyles = () => {
        const style = document.createElement('style');
        style.textContent = `
            /* 填空題輸入框 Premium 樣式 */
            .input-box {
                width: 100%;
                padding: 14px 20px;
                font-size: 1.15rem;
                border: 2px solid var(--border-color);
                background: var(--bg-secondary);
                color: var(--text-primary);
                border-radius: 12px;
                margin-top: 10px;
                font-family: 'Inter', "Microsoft JhengHei", sans-serif;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }
            .input-box:focus {
                outline: none;
                border-color: var(--accent-primary);
                box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.15);
                background: var(--bg-primary);
            }
            /* 錯題與對題動態效果 */
            .correct-choice {
                border-color: var(--accent-success) !important;
                background: rgba(16, 185, 129, 0.08) !important;
            }
            .wrong-choice {
                border-color: var(--accent-danger) !important;
                background: rgba(239, 68, 68, 0.08) !important;
            }
            /* 進度與統計回饋 */
            .score-badge {
                display: inline-block;
                padding: 8px 16px;
                border-radius: 99px;
                font-weight: 800;
                font-size: 1.6rem;
                margin-top: 8px;
                font-family: 'Outfit', sans-serif;
            }
            .score-perfect {
                color: var(--accent-success);
                background: rgba(16, 185, 129, 0.1);
            }
            .score-good {
                color: var(--accent-primary);
                background: rgba(99, 102, 241, 0.1);
            }
            .score-tryagain {
                color: var(--accent-warning);
                background: rgba(245, 158, 11, 0.1);
            }
            .explanation-box {
                font-size: 0.95rem;
                color: var(--text-secondary);
                background: var(--bg-primary);
                padding: 12px 18px;
                border-radius: 8px;
                margin-top: 8px;
                border-left: 4px solid var(--accent-primary);
            }
        `;
        document.head.appendChild(style);
    };

    // 4. 動態建構 DOM 結構
    const buildAppUI = () => {
        const appContainer = document.getElementById('quiz-app') || document.body;
        
        // 清空容器（防止多餘殘留）
        appContainer.innerHTML = '';

        // 暗色模式切換按鈕
        const themeToggleDiv = document.createElement('div');
        themeToggleDiv.className = 'theme-toggle';
        themeToggleDiv.innerHTML = `<button id="themeBtn"><span>🌙</span> 暗色模式</button>`;
        appContainer.appendChild(themeToggleDiv);

        // 主容器
        const containerDiv = document.createElement('div');
        containerDiv.className = 'container';

        // 麵包屑/返回目錄
        const backUrl = CONFIG.backUrl || 'index.html';
        const backText = CONFIG.backText || '⬅ 返回目錄';
        containerDiv.innerHTML += `<p><a href="${backUrl}" style="text-decoration: none; font-weight: bold; color: var(--accent-primary);">${backText}</a></p>`;

        // 標題
        containerDiv.innerHTML += `<h1>${CONFIG.title}</h1>`;

        // 自訂資訊區塊 (比如學生姓名座號，可選)
        if (CONFIG.infoBlock) {
            containerDiv.innerHTML += CONFIG.infoBlock;
        }

        // 測驗 Form 容器
        const quizForm = document.createElement('form');
        quizForm.id = 'quizForm';
        
        const questionsContainer = document.createElement('div');
        questionsContainer.id = 'questionsContainer';
        quizForm.appendChild(questionsContainer);

        // 提交按鈕
        quizForm.innerHTML += `<button id="submitBtn" type="button" style="margin-top: 20px;">提交答案查看結果</button>`;
        containerDiv.appendChild(quizForm);

        // 測驗結果顯示面板
        const resultPanel = document.createElement('div');
        resultPanel.id = 'result';
        resultPanel.style.display = 'none';
        resultPanel.innerHTML = `
            <h2>測試結果</h2>
            <p id="scoreText" style="font-size: 1.5em;"></p>
            <div id="wrongAnswers"></div>
        `;
        containerDiv.appendChild(resultPanel);

        // 歷史回顧區塊
        const historySection = document.createElement('div');
        historySection.className = 'history-section';
        historySection.innerHTML = `
            <h3>📊 測驗紀錄回顧 (教師專用)</h3>
            <div id="historyList" style="margin-top: 15px;">尚無測驗紀錄</div>
            <button id="clearHistoryBtn" style="margin-top: 20px; background: var(--accent-danger); color: white; border: none; padding: 10px 16px; border-radius: 8px; cursor: pointer; font-size: 12px; font-weight: bold; transition: opacity 0.2s;">清除所有紀錄</button>
        `;
        containerDiv.appendChild(historySection);

        appContainer.appendChild(containerDiv);

        // 綁定事件監聽器
        document.getElementById('themeBtn').addEventListener('click', toggleTheme);
        document.getElementById('submitBtn').addEventListener('click', calculateScore);
        document.getElementById('clearHistoryBtn').addEventListener('click', clearHistory);
    };

    // 5. 渲染題目
    const renderQuestions = () => {
        const container = document.getElementById('questionsContainer');
        let globalIndex = 0;

        if (CONFIG.sections && Array.isArray(CONFIG.sections)) {
            // 分區渲染
            CONFIG.sections.forEach((section) => {
                let sectionHtml = `<h2 style="margin-top: 2.5rem; border-left: 5px solid var(--accent-primary); padding-left: 15px; font-family: 'Outfit', sans-serif;">${section.title}</h2>`;
                if (section.instructions) {
                    sectionHtml += `<p style="color: var(--text-secondary); margin-bottom: 1.5rem; font-weight: 500;">${section.instructions}</p>`;
                }
                
                section.questions.forEach((data, idx) => {
                    sectionHtml += buildQuestionDOM(data, idx + 1, globalIndex);
                    globalIndex++;
                });
                
                const sectionWrapper = document.createElement('div');
                sectionWrapper.innerHTML = sectionHtml;
                container.appendChild(sectionWrapper);
            });
        } else if (CONFIG.questions && Array.isArray(CONFIG.questions)) {
            // 單一扁平列表渲染
            CONFIG.questions.forEach((data, idx) => {
                const questionWrapper = document.createElement('div');
                questionWrapper.innerHTML = buildQuestionDOM(data, idx + 1, globalIndex);
                container.appendChild(questionWrapper);
                globalIndex++;
            });
        }
    };

    // 輔助函式：建立單一題目的 HTML 字串
    const buildQuestionDOM = (data, listIndex, globalIndex) => {
        let html = `<div class="question" id="question-${globalIndex}" data-idx="${globalIndex}">
            <p><strong>${listIndex}. ${data.q}</strong></p>`;

        if (data.a && Array.isArray(data.a)) {
            // 選擇題
            html += `<ul class="options">`;
            data.a.forEach((opt, i) => {
                html += `<li><label><input type="radio" name="q${globalIndex}" value="${i}"> <span>${opt}</span></label></li>`;
            });
            html += `</ul>`;
        } else {
            // 填空題
            html += `<input type="text" class="input-box" name="q${globalIndex}" placeholder="請在此輸入答案...">`;
        }

        html += `</div>`;
        return html;
    };

    // 6. 亮暗色模式邏輯
    const applyTheme = (theme) => {
        document.documentElement.setAttribute('data-theme', theme);
        const btn = document.getElementById('themeBtn');
        if (btn) {
            btn.innerHTML = theme === 'dark' 
                ? '<span>☀️</span> 亮色模式' 
                : '<span>🌙</span> 暗色模式';
        }
    };

    const toggleTheme = () => {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        localStorage.setItem('theme', newTheme);
        applyTheme(newTheme);
    };

    const initTheme = () => {
        const savedTheme = localStorage.getItem('theme') || 'light';
        applyTheme(savedTheme);
    };

    // 7. 歷史歷程紀錄管理
    const displayHistory = () => {
        const history = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
        const listContainer = document.getElementById('historyList');
        
        if (history.length === 0) {
            listContainer.innerHTML = `<div style="color: var(--text-secondary); text-align: center; padding: 20px; font-style: italic;">尚無測驗紀錄</div>`;
            return;
        }

        listContainer.innerHTML = history.slice().reverse().map((item, idx) => {
            const rawScore = item.score;
            const total = item.total;
            const percentage = Math.round((rawScore / total) * 100);
            
            return `
            <div class="history-item">
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                    <strong>第 ${history.length - idx} 次測驗 - ${item.date}</strong>
                    <span style="font-weight: 800; color: var(--accent-primary);">${rawScore} / ${total} 題 (${percentage}分)</span>
                </div>
                <details style="margin-top: 12px; border-top: 1px solid var(--border-color); padding-top: 8px;">
                    <summary style="cursor: pointer; color: var(--accent-primary); font-weight: 600; font-size: 0.95rem; user-select: none;">查看錯題細節</summary>
                    <div style="margin-top: 10px;">
                        ${item.mistakes && item.mistakes.length > 0 ? item.mistakes.map(m => `
                            <div style="border-bottom: 1px dashed var(--border-color); padding: 8px 0; font-size: 0.95rem;">
                                <p style="margin-bottom: 4px;"><strong>問：</strong>${m.question}</p>
                                <p>
                                    <span style="color: var(--accent-danger); font-weight: bold;">答：${m.userAnswer}</span>
                                    <span style="color: var(--text-secondary); margin: 0 8px;">|</span>
                                    <span style="color: var(--accent-success); font-weight: bold;">正：${m.correctAnswer}</span>
                                </p>
                                ${m.explanation ? `<div class="explanation-box">💡 ${m.explanation}</div>` : ''}
                            </div>`).join('') : `<p style="color: var(--accent-success); font-weight: bold; padding: 5px 0;">🎉 太厲害了！全部正確！</p>`}
                    </div>
                </details>
            </div>`;
        }).join('');
    };

    const clearHistory = () => {
        if (confirm("確定要清除本測驗的所有歷史紀錄嗎？（清除後無法還原）")) {
            localStorage.removeItem(STORAGE_KEY);
            displayHistory();
        }
    };

    // 8. 評分核心邏輯
    const calculateScore = () => {
        let score = 0;
        let mistakes = [];

        flatQuizData.forEach((data, index) => {
            const questionDiv = document.getElementById(`question-${index}`);
            let isCorrect = false;
            let userAnswerText = "未作答";

            if (data.a && Array.isArray(data.a)) {
                // A. 選擇題判斷
                const selected = document.querySelector(`input[name="q${index}"]:checked`);
                const userAnsVal = selected ? parseInt(selected.value) : -1;
                
                userAnswerText = userAnsVal !== -1 ? data.a[userAnsVal] : "未作答";
                isCorrect = (userAnsVal === data.correct);

                // 更新選項的 UI 視覺回饋
                const labels = questionDiv.querySelectorAll('.options label');
                labels.forEach((label, i) => {
                    label.className = ''; // 重置
                    if (i === data.correct) {
                        label.classList.add('correct-choice');
                    } else if (selected && i === userAnsVal) {
                        label.classList.add('wrong-choice');
                    }
                });
            } else {
                // B. 填空題判斷
                const inputField = questionDiv.querySelector(`input[name="q${index}"]`);
                const userInput = inputField.value.trim().toLowerCase().replace(/[.?!]$/, '');
                userAnswerText = inputField.value.trim() || "未作答";

                // 支持單一字串答案或陣列答案
                const acceptableAnswers = Array.isArray(data.correct) 
                    ? data.correct 
                    : [data.correct];

                isCorrect = acceptableAnswers.some(ans => {
                    const normalizedAns = ans.trim().toLowerCase().replace(/[.?!]$/, '');
                    return userInput === normalizedAns;
                });

                // 更新輸入框的 UI 視覺回饋
                inputField.className = 'input-box'; // 重置
                if (isCorrect) {
                    inputField.classList.add('correct-choice');
                } else {
                    inputField.classList.add('wrong-choice');
                }
            }

            // 統計與紀錄
            if (isCorrect) {
                score++;
            } else {
                const correctText = (data.a && Array.isArray(data.a)) 
                    ? data.a[data.correct] 
                    : (Array.isArray(data.correct) ? data.correct.join(' 或 ') : data.correct);

                mistakes.push({
                    question: data.q,
                    userAnswer: userAnswerText,
                    correctAnswer: correctText,
                    explanation: data.explanation || null
                });
            }
        });

        // 儲存至 LocalStorage
        const history = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
        history.push({
            date: new Date().toLocaleString(),
            score: score,
            total: flatQuizData.length,
            mistakes: mistakes
        });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(history));

        // 9. 展示測驗結果與精美回饋
        const resultDiv = document.getElementById('result');
        const scoreText = document.getElementById('scoreText');
        const percentage = Math.round((score / flatQuizData.length) * 100);
        
        let scoreClass = 'score-tryagain';
        let feedbackEmoji = '💪';
        let feedbackMsg = '再接再厲，加油！多複習一次課文會更好喔！';

        if (percentage === 100) {
            scoreClass = 'score-perfect';
            feedbackEmoji = '🎉';
            feedbackMsg = '完美的滿分！你簡直是小學霸！';
        } else if (percentage >= 80) {
            scoreClass = 'score-good';
            feedbackEmoji = '👍';
            feedbackMsg = '表現非常優異！已經掌握了絕大部分的知識！';
        }

        resultDiv.style.display = 'block';
        scoreText.innerHTML = `
            得分：<strong>${score}</strong> / ${flatQuizData.length} 題
            <br>
            <span class="score-badge ${scoreClass}">${percentage}分 ${feedbackEmoji}</span>
            <p style="font-size: 1.1rem; margin-top: 12px; font-weight: 600; color: var(--text-primary);">${feedbackMsg}</p>
        `;

        // 顯示本次的錯題明細於結果面板中
        const wrongAnswersDiv = document.getElementById('wrongAnswers');
        if (mistakes.length > 0) {
            wrongAnswersDiv.innerHTML = `<h3 style="margin-top: 20px; color: var(--accent-danger); font-size: 1.15rem;">❌ 錯題檢討：</h3>` + mistakes.map(m => `
                <div style="background: var(--bg-primary); border-left: 4px solid var(--accent-danger); padding: 12px 18px; border-radius: 8px; margin-top: 10px;">
                    <p style="margin-bottom: 4px;"><strong>問：</strong>${m.question}</p>
                    <p>
                        <span style="color: var(--accent-danger); font-weight: bold;">您的作答：${m.userAnswer}</span>
                        <span style="color: var(--text-secondary); margin: 0 8px;">|</span>
                        <span style="color: var(--accent-success); font-weight: bold;">正確答案：${m.correctAnswer}</span>
                    </p>
                    ${m.explanation ? `<div class="explanation-box">💡 解析：${m.explanation}</div>` : ''}
                </div>
            `).join('');
        } else {
            wrongAnswersDiv.innerHTML = ``;
        }

        // 重新更新歷史看板並平滑滾動至結果
        displayHistory();
        resultDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    // 10. 引擎啟動載入
    const initEngine = () => {
        injectStyles();
        buildAppUI();
        initTheme();
        renderQuestions();
        displayHistory();
    };

    // 如果 DOM 已經載入，直接執行，否則監聽 DOMContentLoaded
    if (document.readyState === 'loading') {
        window.addEventListener('DOMContentLoaded', initEngine);
    } else {
        initEngine();
    }
})();
