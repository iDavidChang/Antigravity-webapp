// main.js - Frontend Logic for AI Emotion Diary

document.addEventListener('DOMContentLoaded', () => {
    const diaryInput = document.getElementById('diary-input');
    const btnVoice = document.getElementById('btn-voice');
    const btnAnalyze = document.getElementById('btn-analyze');
    const aiResponseBox = document.getElementById('ai-response-box');
    const aiResponseText = document.getElementById('ai-response-text');
    const loadingIndicator = document.getElementById('loading-indicator');

    // 1. Load from Local Storage (Persistence)
    const savedDiary = localStorage.getItem('diary_content');
    const savedResponse = localStorage.getItem('ai_response');

    if (savedDiary) {
        diaryInput.value = savedDiary;
    }

    if (savedResponse) {
        aiResponseText.innerHTML = savedResponse;
        aiResponseText.classList.remove('hidden');
        aiResponseBox.classList.add('active');
    }

    // 2. Voice Recognition Setup (Web Speech API)
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition;

    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.lang = 'ko-KR';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
            console.log('Voice recognition started');
            btnVoice.innerHTML = '<span class="icon">🎙️</span> 음성 인식 중...';
            btnVoice.classList.add('recording');
        };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            console.log('Voice recognized:', transcript);
            diaryInput.value += (diaryInput.value ? ' ' : '') + transcript;
        };

        recognition.onend = () => {
            console.log('Voice recognition ended');
            btnVoice.innerHTML = '<span class="icon">🎙️</span> 음성으로 입력하기';
            btnVoice.classList.remove('recording');
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            if (event.error === 'not-allowed') {
                alert('마이크 사용 권한이 거부되었습니다. 브라우저 설정에서 마이크 권한을 허용해 주세요.');
            } else {
                alert(`음성 인식 중 오류가 발생했습니다: ${event.error}`);
            }
            btnVoice.innerHTML = '<span class="icon">🎙️</span> 음성으로 입력하기';
            btnVoice.classList.remove('recording');
        };
    } else {
        console.warn('SpeechRecognition API not supported in this browser.');
    }

    btnVoice.addEventListener('click', () => {
        if (!recognition) {
            alert('이 브라우저는 음성 인식을 지원하지 않습니다.');
            return;
        }

        if (btnVoice.classList.contains('recording')) {
            recognition.stop();
        } else {
            recognition.start();
        }
    });

    // 3. Backend API Call Logic (Vercel Serverless Function)
    btnAnalyze.addEventListener('click', async () => {
        const text = diaryInput.value.trim();
        
        if (!text) {
            alert('일기 내용을 입력해주세요.');
            return;
        }

        // UI Feedback: Start Loading
        aiResponseText.classList.add('hidden');
        loadingIndicator.classList.remove('hidden');
        aiResponseBox.classList.remove('active');
        btnAnalyze.disabled = true;

        try {
            // Call the Vercel Backend instead of the direct Gemini SDK
            const response = await fetch('/api/analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ text })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || '네트워크 응답에 문제가 있습니다.');
            }

            const data = await response.json();
            const responseText = data.result.trim();

            loadingIndicator.classList.add('hidden');
            aiResponseText.innerHTML = responseText.replace(/\n/g, '<br>');
            aiResponseText.classList.remove('hidden');
            aiResponseBox.classList.add('active');
            
            // Save to Local Storage
            localStorage.setItem('diary_content', text);
            localStorage.setItem('ai_response', aiResponseText.innerHTML);
            
            aiResponseBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } catch (error) {
            console.error('API Error:', error);
            loadingIndicator.classList.add('hidden');
            aiResponseText.textContent = `에러가 발생했습니다: ${error.message}`;
            aiResponseText.classList.remove('hidden');
            aiResponseBox.classList.add('active');
        } finally {
            btnAnalyze.disabled = false;
        }
    });
});
