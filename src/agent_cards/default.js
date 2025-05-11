module.exports = {
    CONFIG: {
        // Tencent Cloud API client configuration
        apiConfig: {
            secretId: process.env.TENCENT_SECRET_ID,      // [Required] Replace with your actual SecretId
            secretKey: process.env.TENCENT_SECRET_KEY,     // [Required] Replace with your actual SecretKey
            region: process.env.TENCENT_REGION || "ap-beijing", // API access to the nearest region
            endpoint: process.env.TENCENT_ENDPOINT || "trtc.tencentcloudapi.com"
        },
    
        // TRTC configuration
        trtcConfig: {
            sdkAppId: parseInt(process.env.TRTC_SDK_APP_ID),     // [Required] Replace with your actual SDKAppId
            secretKey: process.env.TRTC_SECRET_KEY,          // [Required] Replace with your actual SecretKey
            expireTime: 10 * 60 * 60  // User signature 10 hours expiration time (seconds)
        },
    
        // Agent card information
        AgentCard: {
            name: "智慧小助手",
            avatar: "/src/agent_cards/assets/ccc.png",
            description: "我是你的AI助手，可以回答日常问题、聊天解闷、提供百科知识。随时随地为你提供帮助！",
            capabilities: ["日常问答", "知识百科", "生活建议", "轻松聊天", "实时互动"],
            voiceType: "温柔女声",
            personality: "友好、知识丰富、温暖、有耐心"
        },
    
        // Agent configuration
        AgentConfig: {
            WelcomeMessage: "你好，我是你的智慧小助手，有什么我可以帮你的吗？",  // First words spoken by the AI as they enter the room
            InterruptMode: 2,  // Auto Interrupt with voiceprint
            TurnDetectionMode: 3,  // Sentence segmentation based on semantics
            InterruptSpeechDuration: 200,  // Sensitivity of interruption
            WelcomeMessagePriority: 1  // Welcome message priority to avoid interruption
        },
    
        // Speech recognition configuration
        STTConfig: {
            Language: "zh",  // 8k ASR model with noise reduction
            VadSilenceTime: 600,  // VAD config for delay and interruption balance
            HotWordList: "小助手|11,解闷|11"  // The hot words list makes the identification more accurate
        },
    
        // LLM configuration
        LLMConfig: {
            LLMType: "openai",  // openai protocol
            Model: process.env.LLM_MODEL,  // [Required] LLM model Name
            APIUrl: process.env.LLM_API_URL, // [Required] Your LLM API Url
            APIKey: process.env.LLM_API_KEY,   // [Required] Replace with your actual LLM APIKey
            History: 5,      // Number of LLM context entries
            Timeout: 3,      // LLM timeout time
            Streaming: true,  // Need streaming
            SystemPrompt: `
                # 基础人设
                - 名称：智慧小助手
                - 性格：友好、温暖、知识渊博
                - 风格：亲切自然，语气温和，耐心解答

                # 能力范围
                - 日常问答：回答用户的日常生活问题
                - 百科知识：提供各领域的知识和信息
                - 生活建议：给出实用的生活小窍门和建议
                - 陪伴聊天：陪伴用户轻松聊天，解答疑惑

                # 聊天规则
                1. 回答方式
                - 回答要简明扼要，不过于冗长
                - 语气亲切友好，如同朋友般交流
                - 专业知识要通俗易懂，避免晦涩难懂的术语

                2. 互动方式
                - 耐心倾听用户问题
                - 在不确定的情况下，坦诚告知并尝试提供相关信息
                - 适当表达关心，但保持适度的专业性
            `,  // LLM system prompt
        },
    
        // Text-to-speech configuration
        TTSConfig: {
            TTSType: "minimax",  // TTS provider
            GroupId: process.env.MINIMAX_TTS_GROUP_ID,
            APIKey: process.env.MINIMAX_TTS_API_KEY,
            VoiceType: process.env.MINIMAX_TTS_VOICE_TYPE,  // Use real customer service voice clone
            APIUrl: process.env.MINIMAX_TTS_API_URL || "http://api.minimax.chat/v1/t2a_v2",
            Model: process.env.MINIMAX_TTS_MODEL || "speech-01-turbo",
            Speed: 1  // Speech speed adjustment for different scenarios
        }
    }
};