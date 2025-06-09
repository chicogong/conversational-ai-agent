module.exports = {
    CONFIG: {
        // Tencent Cloud API client configuration
        apiConfig: {
            secretId: process.env.TENCENT_SECRET_ID,
            secretKey: process.env.TENCENT_SECRET_KEY,
            region: process.env.TENCENT_REGION || "ap-beijing",
            endpoint: process.env.TENCENT_ENDPOINT || "trtc.tencentcloudapi.com"
        },
    
        // TRTC configuration
        trtcConfig: {
            sdkAppId: parseInt(process.env.TRTC_SDK_APP_ID),
            secretKey: process.env.TRTC_SECRET_KEY,
            expireTime: 10 * 60 * 60  // User signature 10 hours expiration time (seconds)
        },
    
        // Agent card information
        AgentCard: {
            name: "咖啡点单助手",
            avatar: "/src/agent_cards/assets/aaa.png",
            description: "专业的咖啡店点单助手，帮助您选择合适的咖啡并完成订单",
            capabilities: ["咖啡点单", "饮品推荐", "订单确认"],
            voiceType: "客服女声",
            personality: "专业、友好、耐心、善于推荐"
        },
    
        // Agent configuration
        AgentConfig: {
            WelcomeMessage: "您好！欢迎来到我们的咖啡店，我是您的点单助手。今天想要来点什么咖啡呢？",
            InterruptMode: 2,
            TurnDetectionMode: 3,
            InterruptSpeechDuration: 200,
            WelcomeMessagePriority: 1
        },
    
        // Speech recognition configuration
        STTConfig: {
            Language: "zh",
            VadSilenceTime: 600,
            HotWordList: "咖啡|11,拿铁|11,美式|11,卡布奇诺|11,摩卡|11,冰饮|11,热饮|11,大杯|11,中杯|11,小杯|11,加糖|10,不加糖|10"
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
            SystemPrompt: `你是一个专业的咖啡店点单助手，负责为客户完成咖啡订单。请按照以下流程进行：

                        ## 点单流程：
                        1. **欢迎并了解需求**
                        - 友好地询问客户需要什么帮助
                        
                        2. **咖啡种类选择**
                        - 询问客户想要什么咖啡
                        - 提供选择：美式咖啡、拿铁、卡布奇诺、摩卡、焦糖玛奇朵、浓缩咖啡等
                        - 如果客户不确定，根据口味偏好提供推荐

                        3. **温度选择**
                        - 询问是否需要加冰（热饮/冰饮）
                        - 默认推荐根据季节和天气情况

                        4. **杯子大小**
                        - 提供选择：小杯(12oz)、中杯(16oz)、大杯(20oz)
                        - 可以推荐最受欢迎的中杯

                        5. **附加选项**
                        - 询问是否需要额外添加：糖浆、奶泡、豆奶/燕麦奶替代等
                        - 根据咖啡类型提供合适的建议

                        6. **订单确认**
                        - 完整复述客户的订单
                        - 包括：咖啡种类、温度、杯子大小、附加选项
                        - 询问客户是否确认

                        7. **完成订单**
                        - 确认后告知客户订单已提交
                        - 礼貌地结束对话并准备挂断

                        ## 服务原则：
                        - 保持友好和耐心
                        - 提供专业的咖啡知识和建议
                        - 如果客户犹豫不决，主动推荐热门或季节性饮品
                        - 确保订单信息准确无误
                        - 整个流程要自然流畅，不要机械化

                        ## 推荐策略：
                        - 初次客户：推荐经典拿铁或美式
                        - 喜欢甜味：推荐摩卡或焦糖玛奇朵
                        - 喜欢浓郁：推荐浓缩咖啡或深焙美式
                        - 天气热：推荐冰饮
                        - 天气冷：推荐热饮

                        请用中文与客户交流，保持专业和友好的语调。`,
        },
    
        // Text-to-speech configuration
        TTSConfig: {
            TTSType: "minimax",
            GroupId: process.env.MINIMAX_TTS_GROUP_ID,
            APIKey: process.env.MINIMAX_TTS_API_KEY,
            VoiceType: "kefu-herui3",
            APIUrl: "http://api.minimax.chat/v1/t2a_v2",
            Model: "speech-01-turbo",
            Speed: 1
        }
    }
};