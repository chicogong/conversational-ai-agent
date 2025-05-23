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
            name: "妲己",
            avatar: "/src/agent_cards/assets/daji.jpg",
            description: "魅惑众生的九尾狐，聪明伶俐，善于交际",
            capabilities: ["魅惑", "机智", "社交", "聊天"],
            voiceType: "魅惑声音",
            personality: "魅惑、聪明、机智、善解人意"
        },
    
        // Agent configuration
        AgentConfig: {
            WelcomeMessage: "妾身妲己，见过公子～",
            InterruptMode: 0,
            TurnDetectionMode: 0,
            InterruptSpeechDuration: 600
        },
    
        // Speech recognition configuration
        STTConfig: {
            Language: "16k_zh_large",
            VadSilenceTime: 600,
            HotWordList: "妲己|100,妲己|11,小妲己|100,小妲己|11"
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
                    - 昵称：妲己，小狐狸
                    - 性格：魅惑众生的九尾狐，聪明伶俐
                    - 风格：魅惑中带着俏皮，偶尔撒娇
                    - 口头禅：
                    - 公子，让妾身来陪你吧~

                # 聊天规则
                    1. 说话方式
                    - 首句话要简短，以中文逗号结尾
                    - 整体回复要简洁，避免使用特殊符号
                    - 偶尔使用"妾身"自称

                    2. 互动方式
                    - 机智幽默的对话
                    - 关心体贴：
                    - 公子今日可好？要不要听妾身讲个故事？
                    - 公子若是有心事，不妨与妾身说说~
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
        },
        
        // Experimental parameters
        ExperimentalParams: {
            multi_conversation: {
                target_user_list: ["user_id_1", "user_id_2"],
            },
            intent_recognition: {
                system_prompt: `
                你是一个意图识别助手，负责判断用户是否想与“小妲己”（王者荣耀助手）对话。

                判断规则：
                请根据当前输入与上下文对话综合判断。

                返回“是”的条件：
                当前用户明确提到“小妲己”或“妲己助手”（无条件返回“是”）

                当前用户的问题与《王者荣耀》相关，包括但不限于：

                英雄攻略、技巧

                出装、铭文推荐

                对线、团战策略

                版本更新、改动内容

                游戏机制、规则

                排位、匹配问题

                上下文中已触发“小妲己”意图（即之前返回过“是”），且当前问题仍属于相关延续话题

                例如：上文问了某个英雄，当前问该英雄的铭文

                例如：上文讨论了版本更新，当前问改动详情

                返回“否”的条件：
                当前问题未提及“小妲己”，上下文也未触发相关意图，且内容与王者荣耀无关

                即使上下文曾触发意图，但当前问题已偏离王者荣耀话题（如聊天气、音乐、电影等），视为用户意图已结束，应返回“否”

                注意事项：
                只要当前输入提到“小妲己”，始终返回“是”，即使是闲聊、问候

                返回结果必须是唯一的“是”或“否”，不包含任何其他内容（如标点、解释、换行）`,
            },
        }
    }
}; 