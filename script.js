// import CONFIG from './config.js'; 
// import { GoogleGenerativeAI } from '@google/generative-ai';

document.addEventListener('DOMContentLoaded', () => {
    // Lucide Icons
    lucide.createIcons();

    const diaryInput = document.getElementById('diaryInput');
    const voiceBtn = document.getElementById('voiceBtn');
    const analyzeBtn = document.getElementById('analyzeBtn');
    const aiResponse = document.getElementById('aiResponse');
    const historyList = document.getElementById('historyList');

    // --- 음성 인식 설정 ---
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (Recognition) {
        const recognition = new Recognition();
        recognition.lang = 'ko-KR';
        recognition.interimResults = true;
        recognition.continuous = false;

        let isRecognizing = false;

        voiceBtn.addEventListener('click', () => {
            if (isRecognizing) {
                recognition.stop();
            } else {
                recognition.start();
            }
        });

        recognition.onstart = () => {
            isRecognizing = true;
            voiceBtn.classList.add('recording');
            voiceBtn.innerHTML = '<i data-lucide="mic-off"></i> 음성 인식 중...';
            lucide.createIcons();
            voiceBtn.style.background = '#fee2e2';
            voiceBtn.style.color = '#ef4444';
        };

        recognition.onend = () => {
            isRecognizing = false;
            voiceBtn.classList.remove('recording');
            voiceBtn.innerHTML = '<i data-lucide="mic"></i> 음성으로 입력하기';
            lucide.createIcons();
            voiceBtn.style.background = '';
            voiceBtn.style.color = '';
        };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            if (event.results[0].isFinal) {
                const currentText = diaryInput.value;
                diaryInput.value = currentText ? currentText + ' ' + transcript : transcript;
            }
        };

        recognition.onerror = (event) => {
            console.error('음성 인식 오류:', event.error);
            isRecognizing = false;
        };
    } else {
        voiceBtn.disabled = true;
        voiceBtn.title = '이 브라우저는 음성 인식을 지원하지 않습니다.';
    }

    // --- 로컬 스토리지 데이터 불러오기 ---
    const loadSavedData = () => {
        const savedDiary = localStorage.getItem('diary_content');
        const savedResponse = localStorage.getItem('ai_response');

        if (savedDiary) {
            diaryInput.value = savedDiary;
        }
        if (savedResponse) {
            aiResponse.style.opacity = '1';
            aiResponse.style.color = 'var(--text-main)';
            aiResponse.style.textAlign = 'left';
            aiResponse.style.justifyContent = 'flex-start';
            aiResponse.innerHTML = savedResponse;
        }
    };

    const saveToLocal = (diary, response) => {
        localStorage.setItem('diary_content', diary);
        localStorage.setItem('ai_response', response);
    };

    // --- 히스토리 기능 ---
    const fetchHistory = async () => {
        try {
            const response = await fetch('/api/history');
            const result = await response.json();
            
            if (result.success) {
                renderHistory(result.data);
            }
        } catch (error) {
            console.error('히스토리 불러오기 실패:', error);
        }
    };

    const renderHistory = (data) => {
        if (!data || data.length === 0) {
            historyList.innerHTML = '<div class="empty-message">저장된 일기가 없습니다.</div>';
            return;
        }

        historyList.innerHTML = data.map(item => {
            const date = new Date(item.createdAt).toLocaleString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            return `
                <div class="history-card">
                    <span class="date">${date}</span>
                    <div class="diary-content">${item.diary.replace(/\n/g, '<br>')}</div>
                    <div class="ai-answer">${item.aiResponse.replace(/\n/g, '<br>')}</div>
                </div>
            `;
        }).join('');
    };

    // 페이지 로드 시 실행
    loadSavedData();
    fetchHistory();

    // --- 분석 요청 클릭 ---
    analyzeBtn.addEventListener('click', async () => {
        const text = diaryInput.value.trim();
        if (!text) {
            alert('먼저 일기를 작성해 주세요!');
            return;
        }

        // 로딩 상태 표시
        aiResponse.innerHTML = '<div class="loading"></div> AI가 일기를 읽고 분석 중입니다...';
        aiResponse.style.opacity = '0.6';
        analyzeBtn.disabled = true;
        
        try {
            // 백엔드 API (api/analyze.js) 호출
            const response = await fetch('/api/analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ diaryText: text })
            });

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.message || '분석 중 오류가 발생했습니다.');
            }

            const responseText = result.responseText;

            // 답변 표시 및 스타일 조정
            const formattedResponse = responseText.replace(/\n/g, '<br>');
            aiResponse.style.opacity = '1';
            aiResponse.style.color = 'var(--text-main)';
            aiResponse.style.textAlign = 'left';
            aiResponse.style.justifyContent = 'flex-start';
            aiResponse.innerHTML = formattedResponse;
            
            // 로컬 스토리지에 데이터 저장 (기존 기능 유지)
            saveToLocal(text, formattedResponse);
            
            // 분석 성공 후 히스토리 갱신
            fetchHistory();
            
        } catch (error) {
            console.error('Gemini API 상세 오류:', error);
            aiResponse.style.opacity = '1';
            aiResponse.style.color = '#ef4444';
            
            let message = '오류가 발생했습니다.';
            if (window.location.protocol === 'file:') {
                message = '⚠️ 파일을 직접 실행(file://) 중이신가요? 보안 정책상 로컬 서버(Live Server 등)를 통해서만 작동합니다.';
            } else if (error.message.includes('API_KEY_INVALID')) {
                message = '⚠️ API 키가 유효하지 않습니다. config.js의 키를 다시 확인해 주세요.';
            } else {
                message = `⚠️ API 연결 실패: ${error.message || '알 수 없는 오류'}`;
            }
            
            aiResponse.innerHTML = message;
        } finally {
            analyzeBtn.disabled = false;
        }
    });
});
