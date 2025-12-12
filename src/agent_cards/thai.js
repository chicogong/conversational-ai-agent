/**
 * Thai Language AI Assistant Agent Configuration
 * 泰语语音助手配置
 *
 * Features:
 * - STT: Thai language recognition (Language: "th")
 * - LLM: Thai language conversation with cultural context
 * - TTS: Thai voice synthesis (Minimax or Tencent Cloud)
 */

module.exports = {
    CONFIG: {
        // Tencent Cloud API configuration
        apiConfig: {
            secretId: process.env.TENCENT_SECRET_ID,
            secretKey: process.env.TENCENT_SECRET_KEY,
            region: process.env.TENCENT_REGION || "ap-guangzhou",  // Bangkok region for better latency
            endpoint: process.env.TENCENT_ENDPOINT || "trtc.tencentcloudapi.com"
        },

        // TRTC configuration
        trtcConfig: {
            sdkAppId: parseInt(process.env.TRTC_SDK_APP_ID),
            secretKey: process.env.TRTC_SECRET_KEY,
            expireTime: 10 * 60 * 60  // 10 hours
        },

        // Agent card information (UI display)
        AgentCard: {
            name: "ผู้ช่วยภาษาไทย",  // Thai Assistant
            avatar: "/src/agent_cards/assets/ccc.png",
            description: "ผู้ช่วย AI ที่พูดภาษาไทยได้อย่างคล่องแคล่ว สามารถตอบคำถาม แนะนำ และให้ความช่วยเหลือได้ในทุกเรื่อง",
            capabilities: [
                "ตอบคำถาม",           // Answer questions
                "การสนทนา",           // Conversation
                "ให้คำแนะนำ",         // Give advice
                "ความรู้ทั่วไป",      // General knowledge
                "การโต้ตอบแบบเรียลไทม์"  // Real-time interaction
            ],
            voiceType: "เสียงหญิงไทย",  // Thai female voice
            personality: "เป็นมิตร, ใจเย็น, มีความรู้, อดทน"
        },

        // Agent behavior configuration
        AgentConfig: {
            WelcomeMessage: "สวัสดีค่ะ ฉันคือผู้ช่วยภาษาไทย มีอะไรให้ช่วยไหมคะ?",
            InterruptMode: 2,  // Auto interrupt with voiceprint
            TurnDetectionMode: 3,  // Semantic-based sentence segmentation
            InterruptSpeechDuration: 200,
            WelcomeMessagePriority: 1
        },

        // Speech recognition configuration
        STTConfig: {
            Language: "th",  // Thai language code (confirmed by user)
            VadSilenceTime: 600,  // Balance between delay and interruption
            HotWordList: "สวัสดี|11,ขอบคุณ|11,ช่วยเหลือ|10,กรุณา|10,ครับ|9,ค่ะ|9"  // Common Thai words
        },

        // LLM configuration
        LLMConfig: {
            LLMType: "openai",
            Model: process.env.LLM_MODEL,
            APIUrl: process.env.LLM_API_URL,
            APIKey: process.env.LLM_API_KEY,
            History: 5,
            Timeout: 3,
            Streaming: true,
            SystemPrompt: `คุณเป็นผู้ช่วยภาษาไทยที่พูดได้อย่างคล่องแคล่ว

# บุคลิกพื้นฐาน
- ชื่อ: ผู้ช่วยภาษาไทย
- บุคลิกภาพ: เป็นมิตร, อบอุ่น, มีความรู้กว้างขวาง
- รูปแบบการพูด: ใช้ภาษาไทยที่สุภาพและเป็นธรรมชาติ

# กฎสำคัญ (CRITICAL RULES)
1. คุณต้องตอบเป็นภาษาไทยเท่านั้น 100%
2. ห้ามใช้ภาษาอังกฤษหรือภาษาอื่น ยกเว้นศัพท์เทคนิคที่จำเป็น
3. ใช้ภาษาที่สุภาพและเป็นธรรมชาติ
4. หากผู้ใช้ถามเป็นภาษาอื่น ให้ขอให้พูดภาษาไทย

# ขอบเขตความสามารถ
- ตอบคำถามทั่วไปเกี่ยวกับชีวิตประจำวัน
- ให้ข้อมูลในหลากหลายสาขา
- ให้คำแนะนำที่เป็นประโยชน์
- พูดคุยและช่วยคลายเครียด

# วิธีการตอบ
- ตอบอย่างกระชับและชัดเจน ไม่ยืดยาวเกินไป
- ใช้น้ำเสียงที่เป็นมิตร เหมือนการพูดคุยกับเพื่อน
- อธิบายความรู้เชิงวิชาการให้เข้าใจง่าย
- รับฟังคำถามของผู้ใช้อย่างอดทน
- รักษาความสุภาพและความเคารพในทุกการสนทนา`
        },

        // Text-to-speech configuration
        TTSConfig: {
            TTSType: "minimax",
            GroupId: process.env.MINIMAX_TTS_GROUP_ID,
            APIKey: process.env.MINIMAX_TTS_API_KEY,
            // NOTE: Configure Thai voice in .env file
            // If Minimax doesn't support Thai, switch to Tencent Cloud TTS (see fallback plan)
            VoiceType: process.env.MINIMAX_TTS_VOICE_TYPE_THAI || process.env.MINIMAX_TTS_VOICE_TYPE,
            APIUrl: process.env.MINIMAX_TTS_API_URL || "http://api.minimax.chat/v1/t2a_v2",
            Model: process.env.MINIMAX_TTS_MODEL || "speech-01-turbo",
            Speed: 1
        }
    }
};
