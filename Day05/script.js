import CONFIG from './config.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

document.addEventListener('DOMContentLoaded', () => {
    // Lucide Icons
    lucide.createIcons();

    const diaryInput = document.getElementById('diaryInput');
    const voiceBtn = document.getElementById('voiceBtn');
    const analyzeBtn = document.getElementById('analyzeBtn');
    const aiResponse = document.getElementById('aiResponse');

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

    // 페이지 로드 시 실행
    loadSavedData();

    // --- Gemini API 설정 ---
    const genAI = new GoogleGenerativeAI(CONFIG.GEMINI_API_KEY);
    // 사용자 요청에 따라 gemini-2.5-flash 모델을 사용합니다.
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

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
            const prompt = `너는 심리 상담가야. 사용자가 작성한 일기 내용을 읽고, 사용자의 감정을 한 단어(예: 기쁨, 슬픔, 분노, 불안, 평온)로 요약해 줘. 그리고 그 감정에 공감해주고, 따뜻한 응원의 메시지를 2~3문장으로 작성해 줘. 답변 형식은 반드시 '감정:[요약된 감정]\n[응원 메시지]'와 같이 줄바꿈을 포함해서 보내줘.
            
            사용자의 일기 내용: "${text}"`;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const responseText = response.text();

            // 답변 표시 및 스타일 조정
            const formattedResponse = responseText.replace(/\n/g, '<br>');
            aiResponse.style.opacity = '1';
            aiResponse.style.color = 'var(--text-main)';
            aiResponse.style.textAlign = 'left';
            aiResponse.style.justifyContent = 'flex-start';
            aiResponse.innerHTML = formattedResponse;
            
            // 로컬 스토리지에 데이터 저장
            saveToLocal(text, formattedResponse);
            
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
