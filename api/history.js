const Redis = require('ioredis');

export default async function handler(req, res) {
  // GET 요청만 처리
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const REDIS_URL = process.env.REDIS_URL;
  if (!REDIS_URL) {
    console.error('REDIS_URL이 설정되지 않았습니다.');
    return res.status(500).json({ success: false, message: 'Redis URL is not configured' });
  }

  try {
    const redis = new Redis(REDIS_URL);
    
    // 'diary-'로 시작하는 모든 키 가져오기 (SCAN 사용)
    let cursor = '0';
    let allKeys = [];
    
    do {
      const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', 'diary-*', 'COUNT', 100);
      cursor = nextCursor;
      allKeys.push(...keys);
    } while (cursor !== '0');

    if (allKeys.length === 0) {
      await redis.quit();
      return res.status(200).json({ success: true, data: [] });
    }

    // 모든 키의 데이터 가져오기 (MGET)
    const values = await redis.mget(allKeys);
    
    // JSON 파싱 및 데이터 정리
    const history = values
      .map(val => {
        try {
          return JSON.parse(val);
        } catch (e) {
          return null;
        }
      })
      .filter(item => item !== null);
    
    // 최신순 정렬 (createdAt 기준)
    history.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    await redis.quit();
    
    return res.status(200).json({ 
      success: true, 
      data: history 
    });

  } catch (error) {
    console.error('Redis 히스토리 조회 중 오류 발생:', error);
    return res.status(500).json({ 
      success: false, 
      message: '히스토리를 필러오는 중 오류가 발생했습니다.' 
    });
  }
}
