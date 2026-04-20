document.addEventListener('DOMContentLoaded', () => {
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
        
        voiceBtn.addEventListener('click', () => {
            recognition.start();
            voiceBtn.innerHTML = '<i data-lucide="mic-off"></i> 인식 중...';
            lucide.createIcons();
        });

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            diaryInput.value += ' ' + transcript;
        };

        recognition.onend = () => {
            voiceBtn.innerHTML = '<i data-lucide="mic"></i> 음성으로 입력하기';
            lucide.createIcons();
        };
    }

    // --- 분석 요청 (Backend API 호출) ---
    analyzeBtn.addEventListener('click', async () => {
        const text = diaryInput.value.trim();
        if (!text) return alert('내용을 입력해주세요.');

        aiResponse.innerHTML = '<div class="loading"></div> 분석 중...';
        aiResponse.style.opacity = '0.6';

        try {
            // 이제 직접 Gemini를 호출하지 않고, 내부 API(/api/analyze)를 호출합니다.
            const response = await fetch('/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ diaryText: text })
            });

            const result = await response.json();
            
            if (result.success) {
                const formatted = result.responseText.replace(/\n/g, '<br>');
                aiResponse.innerHTML = formatted;
                aiResponse.style.opacity = '1';
                localStorage.setItem('diary_content', text);
                localStorage.setItem('ai_response', formatted);
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            aiResponse.innerHTML = '⚠️ 오류 발생: ' + error.message;
        }
    });

    // 데이터 복원
    const savedDiary = localStorage.getItem('diary_content');
    const savedAi = localStorage.getItem('ai_response');
    if (savedDiary) diaryInput.value = savedDiary;
    if (savedAi) aiResponse.innerHTML = savedAi;
});
