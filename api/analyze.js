const { GoogleGenerativeAI } = require('@google/generative-ai');

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
    // 1. 서버 환경 변수에서 키를 읽어옵니다. (클라이언트에 절대 노출되지 않음)
    const API_KEY = process.env.GEMINI_API_KEY;
    if (!API_KEY) {
        throw new Error('서버에 API 키가 설정되지 않았습니다.');
    }

    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // 2. 프론트엔드에 있던 페르소나 및 프롬프트 로직을 백엔드로 이동
    const prompt = `너는 심리 상담가야. 사용자가 작성한 일기 내용을 읽고, 사용자의 감정을 한 단어(예: 기쁨, 슬픔, 분노, 불안, 평온)로 요약해 줘. 그리고 그 감정에 공감해주고, 따뜻한 응원의 메시지를 2~3문장으로 작성해 줘. 답변 형식은 반드시 '감정:[요약된 감정]\n[응원 메시지]'와 같이 줄바꿈을 포함해서 보내줘.
            
    사용자의 일기 내용: "${diaryText}"`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const responseText = response.text();

    // 3. 분석 결과만 깔끔하게 반환
    return res.status(200).json({ 
      success: true, 
      responseText: responseText 
    });

  } catch (error) {
    console.error('Gemini 서버 오류:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'AI 분석 중 서버 오류가 발생했습니다.' 
    });
  }
}
