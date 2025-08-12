const express = require('express');
const path = require('path');
const morgan = require('morgan');
const cors = require('cors');
const tencentcloud = require("tencentcloud-sdk-nodejs-trtc");
const TLSSigAPIv2 = require('tls-sig-api-v2');
const agentConfig = require('./src/agent_cards');
const { sendReq } = require('./capi');
const OpenAI = require('openai');

const TrtcClient = tencentcloud.trtc.v20190722.Client;

// Check for available agent configurations
const availableAgents = Object.keys(agentConfig);
if (availableAgents.length === 0) {
  console.error("No agent configurations found in agent_cards. Server might not function correctly.");
  process.exit(1);
}

const app = express();
app.use(morgan(':method :url :status :res[content-length] - :response-time ms'));
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1m', etag: true }));
app.use('/src', express.static(path.join(__dirname, 'src'), { maxAge: '1m', etag: true }));

/**
 * Create a new TRTC client instance for a specific agent
 * @param {string} agentId - Agent ID used to get configuration
 * @returns {Object} New TRTC client instance
 */
function createClientForAgent(agentId) {
  if (!agentConfig[agentId] || !agentConfig[agentId].CONFIG || !agentConfig[agentId].CONFIG.apiConfig) {
    throw new Error(`Invalid configuration for agent: ${agentId}`);
  }
  
  const { apiConfig } = agentConfig[agentId].CONFIG;
  console.log(`Creating new TRTC client with config from agent: ${agentId}`);
  
  return new TrtcClient({
    credential: {
      secretId: apiConfig.secretId,
      secretKey: apiConfig.secretKey,
    },
    region: apiConfig.region,
    profile: {
      httpProfile: {
        endpoint: apiConfig.endpoint,
      },
    },
  });
}

/**
 * Format agent information for client response
 * @param {string} agentName - Agent identifier
 * @param {Object} agentCardConfig - Agent card configuration
 * @returns {Object} Formatted agent information
 */
function formatAgentInfo(agentName, agentCardConfig) {
  const agentCard = agentCardConfig || {};
  return {
    id: agentName,
    name: agentCard.name || `Agent (${agentName})`,
    avatar: agentCard.avatar || '/src/agent_cards/assets/default.png',
    description: agentCard.description || 'No description available.',
    capabilities: Array.isArray(agentCard.capabilities) ? agentCard.capabilities : [],
    voiceType: agentCard.voiceType || 'Default Voice',
    personality: agentCard.personality || 'Helpful and friendly'
  };
}

/**
 * Start an AI conversation
 * POST /conversations
 */
app.post('/conversations', (req, res) => {
  try {
    const { userInfo } = req.body || {};
    
    if (!userInfo || !userInfo.sdkAppId || !userInfo.roomId || !userInfo.robotId || 
        !userInfo.robotSig || !userInfo.userId || !userInfo.agent) {
      return res.status(400).json({ 
        error: 'Missing required fields in userInfo',
        required: ['sdkAppId', 'roomId', 'robotId', 'robotSig', 'userId', 'agent']
      });
    }
    
    const selectedConfig = agentConfig[userInfo.agent]?.CONFIG;
    if (!selectedConfig) {
      return res.status(400).json({ 
        error: `Agent configuration not found for: ${userInfo.agent}`,
        availableAgents: Object.keys(agentConfig)
      });
    }
    
    const client = createClientForAgent(userInfo.agent);

    const params = {
      "SdkAppId": userInfo.sdkAppId,
      "RoomId": userInfo.roomId.toString(),
      "AgentConfig": {
        "UserId": userInfo.robotId,
        "UserSig": userInfo.robotSig,
        "TargetUserId": userInfo.userId,
        ...selectedConfig.AgentConfig
      },
      "STTConfig": selectedConfig.STTConfig,
      "LLMConfig": JSON.stringify(selectedConfig.LLMConfig),
      "TTSConfig": JSON.stringify(selectedConfig.TTSConfig),
      "ExperimentalParams": JSON.stringify(selectedConfig.ExperimentalParams)
    };

    client.StartAIConversation(params)
      .then(data => res.json(data))
      .catch(err => {
        console.error('Failed to start AI conversation', err);
        return res.status(500).json({ error: err.message });
      });
  } catch (error) {
    console.error('Error in startConversation', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * Stop an AI conversation
 * DELETE /conversations
 */
app.delete('/conversations', (req, res) => {
  try {
    const { TaskId, agent } = req.body;
    
    if (!TaskId) {
      return res.status(400).json({ error: 'Missing required TaskId field' });
    }
    
    if (agent && agentConfig[agent]) {
      const client = createClientForAgent(agent);
      return client.StopAIConversation({ TaskId })
        .then(data => res.json(data))
        .catch(err => {
          console.error('Failed to stop AI conversation', err);
          return res.status(500).json({ error: err.message });
        });
    }
    
    const firstAgentId = availableAgents[0];
    if (!firstAgentId) {
      throw new Error("No agent configuration available for initializing client");
    }
    
    const client = createClientForAgent(firstAgentId);
    client.StopAIConversation({ TaskId })
      .then(data => res.json(data))
      .catch(err => {
        console.error('Failed to stop AI conversation', err);
        return res.status(500).json({ error: err.message });
      });
  } catch (error) {
    console.error('Error in stopConversation', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * Generate user credentials
 * POST /credentials
 */
app.post('/credentials', (req, res) => {
  try {
    const { agentId } = req.body;
    
    if (!agentId) {
      return res.status(400).json({ 
        error: 'Missing agentId in request body',
        availableAgents: Object.keys(agentConfig)
      });
    }
    
    if (!agentConfig[agentId]) {
      throw new Error(`Agent configuration not found for: ${agentId}`);
    }
    
    const config = agentConfig[agentId].CONFIG;
    if (!config.apiConfig) {
      throw new Error(`Invalid API configuration for agent: ${agentId}`);
    }
    
    const { sdkAppId, secretKey, expireTime } = config.trtcConfig;
    const randomNum = Math.floor(100000 + Math.random() * 900000).toString();
    const userId = `user_${randomNum}`;
    const robotId = `ai_${randomNum}`;
    const roomId = parseInt(randomNum);
    
    const api = new TLSSigAPIv2.Api(sdkAppId, secretKey);
    const userSig = api.genSig(userId, expireTime);
    const robotSig = api.genSig(robotId, expireTime);
    
    const credentials = { sdkAppId, userSig, robotSig, userId, robotId, roomId };
    
    res.json(credentials);
  } catch (error) {
    console.error('Failed to generate user information', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * Get all agents information
 * GET /agents
 */
app.get('/agents', (req, res) => {
  try {
    const agentNames = Object.keys(agentConfig);
    const agentsInfo = {};
    
    agentNames.forEach(agentName => {
      const agentConfig_ = agentConfig[agentName];
      const agentCard = agentConfig_.CONFIG.AgentCard || {};
      agentsInfo[agentName] = formatAgentInfo(agentName, agentCard);
    });
    
    res.json({ agents: agentsInfo });
  } catch (error) {
    console.error('Error getting all agents info', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * Get specific agent information
 * GET /agents/:agentId
 */
app.get('/agents/:agentId', (req, res) => {
  try {
    const agentName = req.params.agentId;
    
    if (!agentConfig[agentName]) {
      return res.status(404).json({ 
        error: `Agent '${agentName}' not found`,
        availableAgents: Object.keys(agentConfig)
      });
    }
    
    const agentCard = agentConfig[agentName].CONFIG.AgentCard;
    if (!agentCard) {
      throw new Error(`Agent card configuration missing for ${agentName}`);
    }
    
    res.json(formatAgentInfo(agentName, agentCard));
  } catch (error) {
    console.error('Error getting agent information', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * Handle TRTC-AI server callback
 * POST /callbacks
 * This is the TRTC-AI server callback documentation: https://cloud.tencent.com/document/product/647/115506
 * You can implement custom logic based on different callback event types
 */
app.post('/callbacks', (req, res) => {
  try {
    const sdkAppId = req.headers.sdkappid;
    console.log('Received server callback:', { 
      time: new Date().toLocaleString(), 
      sdkAppId, 
      body: req.body 
    });
    res.json({ code: 0 });
  } catch (error) {
    console.error('Error in server callback', error);
    res.json({ code: -1, error: error.message });
  }
});

/**
 * Update AI transcription target users
 * POST /transcription
 */
app.post('/transcription', async (req, res) => {
  try {
    const { TaskId, TargetUserIdList, agent } = req.body || {};
    if (!TaskId || !Array.isArray(TargetUserIdList) || TargetUserIdList.length === 0) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['TaskId', 'TargetUserIdList']
      });
    }
    
    // 获取配置信息
    let config;
    let agentId = agent;
    
    if (agentId && agentConfig[agentId]) {
      config = agentConfig[agentId].CONFIG.apiConfig;
      console.log(`Using API config from agent: ${agentId}`);
    } else {
      agentId = availableAgents[0];
      if (!agentId) {
        throw new Error('No agent configuration available for initializing client');
      }
      config = agentConfig[agentId].CONFIG.apiConfig;
      console.log(`Agent not specified or invalid. Using default agent: ${agentId}`);
    }
    
    if (!config || !config.secretId || !config.secretKey || !config.endpoint) {
      throw new Error(`Invalid API configuration for agent: ${agentId}`);
    }
    
    // 准备请求参数
    const params = {
      TaskId,
      TargetUserIdList
    };
    
    // 将参数转换为 JSON 字符串
    const payload = JSON.stringify(params);
    
    // 发送请求
    const apiConfig = {
      secretId: config.secretId,
      secretKey: config.secretKey,
      host: config.endpoint
    };
    
    console.log(`Sending ModifyAITranscription request for TaskId: ${TaskId}, Users: ${TargetUserIdList.join(',')}`);
    const data = await sendReq(payload, 'UpdateAITranscription', apiConfig, config.region || 'ap-guangzhou');
    
    // 检查响应中是否有错误
    if (data.Response && data.Response.Error) {
      console.error('API returned error:', data.Response.Error);
      return res.status(400).json({ 
        error: data.Response.Error.Message,
        code: data.Response.Error.Code
      });
    }
    
    console.log('Successfully updated transcription targets');
    res.json(data.Response || data);
  } catch (error) {
    console.error('Failed to update AI transcription:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * Summarize order from conversation
 * POST /order-summary
 */
app.post('/order-summary', async (req, res) => {
  try {
    const { conversation, agentId } = req.body;
    
    if (!conversation || !Array.isArray(conversation)) {
      return res.status(400).json({ 
        error: 'Missing conversation data' 
      });
    }
    
    // Get LLM configuration
    const selectedConfig = agentConfig[agentId || 'take_order']?.CONFIG;
    if (!selectedConfig?.LLMConfig) {
      return res.status(400).json({ 
        error: `LLM configuration not found for agent: ${agentId}` 
      });
    }
    
    const llmConfig = selectedConfig.LLMConfig;
    
    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: llmConfig.APIKey,
      baseURL: llmConfig.APIUrl.replace('chat/completions', '')
    });
    
    // Format conversation
    const conversationText = conversation
      .filter(msg => msg.content?.trim())
      .map(msg => `${msg.type === 'ai' ? 'AI助手' : '客户'}: ${msg.content}`)
      .join('\n');
    
    // Generate prompt based on agent type
    const isOrderAgent = agentId === 'take_order';
    const summaryPrompt = isOrderAgent 
      ? `分析咖啡点单对话，提取订单信息：

对话内容：
${conversationText}

请根据以下咖啡店菜单信息分析订单， 
如果客户没有提到咖啡种类，则默认是拿铁，
如果客户没有提到杯子大小，则默认是中杯，
如果客户没有提到温度，则默认是热饮，
如果客户没有提到附加选项，则默认是加糖

咖啡种类：美式咖啡、拿铁、卡布奇诺、摩卡、焦糖玛奇朵、浓缩咖啡
温度选择：热饮、冰饮
杯子大小：小杯(12oz)、中杯(16oz)、大杯(20oz)
附加选项：糖浆、奶泡、豆奶、燕麦奶、加糖、不加糖

如果客户说不要了、不买了、不点了、不喝了、不想要了，则输出：{"coffee_type": "no_order"}

请以JSON格式输出订单信息：
{
  "coffee_type": "具体咖啡种类（如：拿铁、美式咖啡等）",
  "temperature": "热饮或冰饮", 
  "size": "小杯、中杯或大杯",
  "additions": ["附加选项列表"],
  "summary": "完整订单总结",
  "price_estimate": "预估价格（如果提到）",
  "customer_notes": "客户特殊要求"
}`
      : `总结以下对话的关键信息：\n\n${conversationText}\n\n请提取关键信息并总结。`;

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: llmConfig.Model,
      messages: [
        { role: "system", content: "你是一个专业的对话分析助手。" },
        { role: "user", content: summaryPrompt }
      ],
      temperature: 0.3,
      max_tokens: 500
    });

    const summary = completion.choices[0]?.message?.content?.trim() || '总结生成失败';
    console.log(`Order summary prompt: ${summaryPrompt}\n summary generated: ${summary}`);
    res.json({ success: true, summary });

  } catch (error) {
    console.error('Error in order summary:', error);
    res.status(500).json({ error: error.message });
  }
});

// Start AI transcription
app.post('/start-transcription', async (req, res) => {
  try {
    const { SdkAppId, RoomId, TranscriptionParams, RecognizeConfig, agent } = req.body;
    
    if (!SdkAppId || !RoomId || !TranscriptionParams) {
      return res.status(400).json({ 
        error: 'Missing required fields: SdkAppId, RoomId, TranscriptionParams'
      });
    }
    
    const agentId = agent && agentConfig[agent] ? agent : availableAgents[0];
    if (!agentId) {
      throw new Error('No agent configuration available');
    }
    
    const client = createClientForAgent(agentId);
    
    const params = {
      SdkAppId,
      RoomId: RoomId.toString(),
      TranscriptionParams
    };
    
    if (RecognizeConfig) {
      params.RecognizeConfig = RecognizeConfig;
    }
    
    console.log('🎙️ Starting transcription:', { SdkAppId, RoomId, agentId });
    
    const data = await client.StartAITranscription(params);
    
    res.json({
      ...data,
      userInfo: {
        sdkAppId: SdkAppId,
        roomId: RoomId,
        userId: TranscriptionParams.UserId,
        robotId: TranscriptionParams.UserId,
        agent: agentId
      }
    });
  } catch (error) {
    console.error('❌ Transcription start failed:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Start simultaneous interpretation - API forwarding only
 * POST /interpretation
 */
app.post('/interpretation', (req, res) => {
  try {
    const { sdkAppId, roomId, userId, userSig, robotId, robotSig, agentConfig: clientAgentConfig, sttConfig, llmConfig, ttsConfig, experimentalParams } = req.body || {};
    
    // Basic validation for required fields
    if (!sdkAppId || !roomId || !userId || !userSig || !robotId || !robotSig || !clientAgentConfig || !sttConfig || !llmConfig || !ttsConfig || !experimentalParams) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['sdkAppId', 'roomId', 'userId', 'userSig', 'robotId', 'robotSig', 'agentConfig', 'sttConfig', 'llmConfig', 'ttsConfig', 'experimentalParams']
      });
    }
    
    // Use default client - get first available agent for client creation
    const availableAgentIds = Object.keys(agentConfig);
    const defaultAgentId = availableAgentIds[0];
    
    if (!defaultAgentId) {
      return res.status(500).json({ 
        error: 'No agent configuration available for client creation' 
      });
    }
    
    const client = createClientForAgent(defaultAgentId);
    
    // Prepare API parameters - direct forwarding from frontend
    const params = {
      "SdkAppId": sdkAppId,
      "RoomId": roomId.toString(),
      "AgentConfig": {
        "UserId": robotId,
        "UserSig": robotSig,
        "TargetUserId": userId,
        ...clientAgentConfig
      },
      "STTConfig": sttConfig,
      "LLMConfig": JSON.stringify(llmConfig),
      "TTSConfig": JSON.stringify(ttsConfig),
      "ExperimentalParams": JSON.stringify(experimentalParams)
    };
    
    console.log('Forwarding interpretation request to API');
    
    client.StartAIConversation(params)
      .then(data => {
        res.json({
          ...data,
          userInfo: {
            sdkAppId: sdkAppId,
            roomId: roomId,
            userId: userId,
            userSig: userSig,
            robotId: robotId,
            robotSig: robotSig,
            agent: 'simultaneous_interpreter'
          }
        });
      })
      .catch(err => {
        console.error('Failed to start AI conversation', err);
        return res.status(500).json({ error: err.message });
      });
  } catch (error) {
    console.error('Error in interpretation', error);
    return res.status(500).json({ error: error.message });
  }
});


const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '127.0.0.1';
app.listen(PORT, HOST, () => console.log(`App running at http://${HOST}:${PORT}/`));