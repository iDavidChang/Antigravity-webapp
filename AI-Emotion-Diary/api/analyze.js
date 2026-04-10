// api/analyze.js
// Vercel Serverless Function (Node.js)

import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req, res) {
  // Only handle POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { text } = req.body;

  if (!text) {
    return res.status(400).json({ error: '일기 내용을 입력해주세요.' });
  }

  // Use environment variable from Vercel/Process
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('SERVER ERROR: GEMINI_API_KEY is missing');
    return res.status(500).json({ error: '서버 설정 오류입니다. API 키를 확인해 주세요.' });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `너는 심리 상담가야. 사용자가 작성한 일기 내용을 읽고, 사용자의 감정을 한 단어(예: 기쁨, 슬픔, 분노, 불안, 평온)로 요약해 줘. 그리고 그 감정에 공감해주고, 따뜻한 응원의 메시지를 2~3문장으로 작성해 줘. 답변 형식은 반드시 '감정:[요약된 감정]\n[응원 메시지]'와 같이 줄바꿈을 포함해서 보내줘.\n\n사용자 일기: "${text}"`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const responseText = response.text().trim();

    return res.status(200).json({ result: responseText });
  } catch (error) {
    console.error('Gemini API Error:', error);
    return res.status(500).json({ 
      error: 'AI 분석 중 오류가 발생했습니다.',
      details: error.message 
    });
  }
}
