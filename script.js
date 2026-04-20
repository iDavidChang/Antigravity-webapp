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

    // --- 분석 요청 클릭 (Vercel Backend 호출) ---
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
            // 직접 Gemini를 호출하는 대신, 우리가 만든 백엔드 API를 호출합니다.
            const response = await fetch('/api/analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ diaryText: text }),
            });

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.message || '분석 요청에 실패했습니다.');
            }

            const responseText = result.responseText;

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
            console.error('분석 오류:', error);
            aiResponse.style.opacity = '1';
            aiResponse.style.color = '#ef4444';
            aiResponse.innerHTML = `⚠️ 오류 발생: ${error.message}`;
        } finally {
            analyzeBtn.disabled = false;
        }
    });
});
