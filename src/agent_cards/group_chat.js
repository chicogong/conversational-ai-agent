module.exports = {
    CONFIG: {
        // Tencent Cloud API client configuration
        apiConfig: {
            secretId: process.env.TENCENT_SECRET_ID,
            secretKey: process.env.TENCENT_SECRET_KEY,
            region: process.env.TENCENT_REGION || "ap-guangzhou",
            endpoint: process.env.TENCENT_ENDPOINT || "trtc.tencentcloudapi.com"
        },
    
        // TRTC configuration
        trtcConfig: {
            sdkAppId: parseInt(process.env.TRTC_SDK_APP_ID),
            secretKey: process.env.TRTC_SECRET_KEY,
            expireTime: 10 * 60 * 60
        },
    
        // Agent card information
        AgentCard: {
            name: "开黑聊天室",
            avatar: "/src/agent_cards/assets/group_chat.jpg",
            description: "多人AI互动聊天室，支持多个AI角色同时对话",
            capabilities: ["多人对话", "角色切换", "话题引导", "互动管理"],
            voiceType: "主持人声音",
            personality: "活泼、热情、善于调节气氛"
        },
    
        // Agent configuration
        AgentConfig: {
            WelcomeMessage: "欢迎来到开黑聊天室！这里有糖糖和妲己陪你聊天哦～",
            InterruptMode: 0,
            TurnDetectionMode: 0,
            InterruptSpeechDuration: 100,
            // 配置可用的AI角色
            AvailableAgents: ["sweet_girl", "daji"],
            // 最大同时在线AI数量
            MaxConcurrentAgents: 2
        },
    
        // Experimental parameters
        ExperimentalParams: {
            isGroupChat: true,
            shareableInvite: true,
            availableAgents: ["sweet_girl", "daji"],
            maxConcurrentAgents: 2
        },
    
        // Speech recognition configuration
        STTConfig: {
            Language: "zh",
            VadSilenceTime: 400,
            HotWordList: ""
        },
    
        // LLM configuration
        LLMConfig: {
            LLMType: "openai",
            Model: process.env.LLM_MODEL,
            APIUrl: process.env.LLM_API_URL,
            APIKey: process.env.LLM_API_KEY,
            History: 4,
            Timeout: 3,
            Streaming: true,
            SystemPrompt: `
                # 基础人设
                    - 角色：聊天室主持人
                    - 职责：管理多个AI角色的对话
                    - 风格：活泼热情，善于调节气氛

                # 聊天规则
                    1. 说话方式
                    - 首句话要简短，以中文逗号结尾
                    - 整体回复要简洁，避免使用特殊符号
                    - 使用"我们"来指代聊天室

                    2. 互动方式
                    - 引导话题：
                    - 这个话题很有趣，让我们听听糖糖和妲己的想法～
                    - 调节气氛：
                    - 看来大家聊得很开心呢，要不要换个话题？
                    - 角色切换：
                    - 妲己，你也来说说你的看法吧～

                    3. 管理规则
                    - 确保每个AI都有发言机会
                    - 避免对话过于混乱
                    - 适时引导话题方向
            `,
        },
    
        // Text-to-speech configuration
        TTSConfig: {
            TTSType: "minimax",
            GroupId: process.env.MINIMAX_TTS_GROUP_ID,
            APIKey: process.env.MINIMAX_TTS_API_KEY,
            VoiceType: process.env.MINIMAX_TTS_VOICE_TYPE,
            APIUrl: process.env.MINIMAX_TTS_API_URL || "http://api.minimax.chat/v1/t2a_v2",
            Model: process.env.MINIMAX_TTS_MODEL || "speech-01-turbo",
            Speed: 1
        }      
    }
}; 