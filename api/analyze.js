const { GoogleGenerativeAI } = require('@google/generative-ai');
const Redis = require('ioredis'); // ioredis 라이브러리 필요

export default async function handler(req, res) {
  // POST 요청만 처리
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { diaryText } = req.body;

  if (!diaryText) {
    return res.status(400).json({ message: '일기 내용이 누락되었습니다.' });
  }

  try {
    // 1. Gemini API 설정
    const API_KEY = process.env.GEMINI_API_KEY;
    if (!API_KEY) {
        throw new Error('서버에 API 키가 설정되지 않았습니다.');
    }

    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `너는 심리 상담가야. 사용자가 작성한 일기 내용을 읽고, 사용자의 감정을 한 단어(예: 기쁨, 슬픔, 분노, 불안, 평온)로 요약해 줘. 그리고 그 감정에 공감해주고, 따뜻한 응원의 메시지를 2~3문장으로 작성해 줘. 답변 형식은 반드시 '감정:[요약된 감정]\n[응원 메시지]'와 같이 줄바꿈을 포함해서 보내줘.
            
    사용자의 일기 내용: "${diaryText}"`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const responseText = response.text();

    // 2. Redis 저장 로직 추가
    const REDIS_URL = process.env.REDIS_URL;
    if (REDIS_URL) {
      try {
        const redis = new Redis(REDIS_URL);
        
        // 고유 ID 생성 (diary-YYYYMMDDHHMMSS)
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const hh = String(now.getHours()).padStart(2, '0');
        const min = String(now.getMinutes()).padStart(2, '0');
        const ss = String(now.getSeconds()).padStart(2, '0');
        
        const timestampId = `diary-${yyyy}${mm}${dd}${hh}${min}${ss}`;
        
        // 데이터 객체 생성
        const dataToStore = {
          diary: diaryText,
          aiResponse: responseText,
          createdAt: now.toISOString()
        };
        
        // Redis에 저장 (문자열 형태로)
        await redis.set(timestampId, JSON.stringify(dataToStore));
        
        // 연결 종료
        await redis.quit();
        console.log(`Successfully saved to Redis: ${timestampId}`);
      } catch (redisError) {
        console.error('Redis 저장 중 오류 발생:', redisError);
        // Redis 저장 실패가 전체 로직의 실패로 이어지지 않도록 예외 처리
      }
    } else {
      console.warn('REDIS_URL이 설정되지 않아 저장을 건너뜁니다.');
    }

    // 3. 분석 결과 반환
    return res.status(200).json({ 
      success: true, 
      responseText: responseText 
    });

  } catch (error) {
    console.error('서버 오류:', error);
    return res.status(500).json({ 
      success: false, 
      message: '분석 중 오류가 발생했습니다.' 
    });
  }
}
