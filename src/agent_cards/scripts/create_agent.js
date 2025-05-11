const fs = require('fs');
const path = require('path');
const readline = require('readline');
const util = require('util');

// ANSI color codes for better console output
const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Configuration templates
const TEMPLATES = {
  default: {
    description: '能够回答日常问题、聊天解闷、提供百科知识的智慧助手',
    capabilities: ['日常问答', '知识百科', '生活建议', '轻松聊天', '实时互动'],
    voiceType: '温柔女声',
    personality: '友好、知识丰富、温暖、有耐心',
    interruptMode: 2,
    language: 'zh',
    llmType: 'openai',
    historyLength: 5,
    timeout: 3,
    streaming: true,
    systemPrompt: `# 基础人设
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
- 适当表达关心，但保持适度的专业性`,
    ttsType: 'minimax',
    ttsApiUrl: 'http://api.minimax.chat/v1/t2a_v2',
    ttsModel: 'speech-01-turbo',
    ttsSpeed: 1,
    region: 'ap-beijing',
    hotWords: '小助手|11,解闷|11'
  },
  customer_service: {
    description: '专业的女性客服',
    capabilities: ['产品咨询', '订单查询', '问题解答', '售后服务', '投诉处理'],
    voiceType: '温柔专业女声',
    personality: '亲切、专业、耐心、善解人意',
    interruptMode: 2,
    language: 'zh',
    llmType: 'openai',
    historyLength: 10,
    timeout: 5,
    streaming: true,
    systemPrompt: `# 基础人设
- 名称：客服小雅
- 性格：专业、亲切、有耐心
- 风格：温和但专业，尊重客户，善于倾听

# 能力范围
- 产品咨询：详细介绍产品特点、功能和使用方法
- 订单查询：协助客户查询订单状态和物流信息
- 问题解答：解决客户使用过程中遇到的各类问题
- 售后服务：处理退换货申请，提供维修指导
- 投诉处理：耐心倾听客户投诉并妥善解决

# 聊天规则
1. 回答方式
- 开场先亲切问候，称呼客户为"亲"或"尊敬的用户"
- 回答专业清晰，条理分明
- 适当使用礼貌用语，如"感谢您的咨询"、"非常抱歉给您带来不便"

2. 互动方式
- 优先理解客户需求，避免生硬回复
- 遇到难题，表达理解并寻求解决方案
- 结束对话时表达感谢并询问是否有其他需要
- 遇到投诉时保持冷静，表达歉意并积极解决问题`,
    ttsType: 'minimax',
    ttsApiUrl: 'http://api.minimax.chat/v1/t2a_v2',
    ttsModel: 'speech-01-turbo',
    ttsSpeed: 1.05,
    region: 'ap-beijing',
    hotWords: '订单|10,退款|10,售后|9,发货|8,客服|8'
  }
};

// Create a readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Function to prompt user for input with colors
function colorPrompt(question, color = COLORS.cyan) {
  return new Promise((resolve) => {
    rl.question(color + question + COLORS.reset, (answer) => {
      resolve(answer.trim());
    });
  });
}

// Generic prompt with validation
async function promptWithValidation(question, defaultValue = '', validator = null, errorMsg = '') {
  while (true) {
    let promptText = question;
    if (defaultValue) {
      promptText += ` (默认: "${defaultValue}")`;
    }
    promptText += ': ';
    
    const answer = await colorPrompt(promptText);
    
    if (!answer && defaultValue) return defaultValue;
    if (!answer && validator) {
      console.log(COLORS.red + errorMsg + COLORS.reset);
      continue;
    }
    
    if (validator && !validator(answer)) {
      console.log(COLORS.red + errorMsg + COLORS.reset);
      continue;
    }
    
    return answer;
  }
}

// Function to generate agent template
function generateAgentTemplate(config) {
  // Escape quotes in strings to prevent breaking the template
  const escapeString = (str) => str.replace(/"/g, '\\"');

  return `module.exports = {
    CONFIG: {
        // Tencent Cloud API client configuration
        apiConfig: {
            secretId: process.env.TENCENT_SECRET_ID,
            secretKey: process.env.TENCENT_SECRET_KEY,
            region: process.env.TENCENT_REGION || "${config.region}",
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
            name: "${escapeString(config.agentName)}",
            avatar: "/src/agent_cards/assets/${config.agentId}.png",
            description: "${escapeString(config.description)}",
            capabilities: ${JSON.stringify(config.capabilities)},
            voiceType: "${escapeString(config.voiceType)}",
            personality: "${escapeString(config.personality)}"
        },
    
        // Agent configuration
        AgentConfig: {
            WelcomeMessage: "${escapeString(config.welcomeMessage)}",
            InterruptMode: ${config.interruptMode},
            TurnDetectionMode: 3,
            InterruptSpeechDuration: 200,
            WelcomeMessagePriority: 1
        },
    
        // Speech recognition configuration
        STTConfig: {
            Language: "${config.language}",
            VadSilenceTime: 600,
            HotWordList: "${config.hotWords}"
        },
    
        // LLM configuration
        LLMConfig: {
            LLMType: "${config.llmType}",
            Model: process.env.LLM_MODEL,
            APIUrl: process.env.LLM_API_URL,
            APIKey: process.env.LLM_API_KEY,
            History: ${config.historyLength},
            Timeout: ${config.timeout},
            Streaming: ${config.streaming},
            SystemPrompt: "${escapeString(config.systemPrompt)}",
        },
    
        // Text-to-speech configuration
        TTSConfig: {
            TTSType: "${config.ttsType}",
            GroupId: process.env.MINIMAX_TTS_GROUP_ID,
            APIKey: process.env.MINIMAX_TTS_API_KEY,
            VoiceType: process.env.MINIMAX_TTS_VOICE_TYPE,
            APIUrl: "${config.ttsApiUrl}",
            Model: "${config.ttsModel}",
            Speed: ${config.ttsSpeed}
        }
    }
};`;
}

// Function to update index.js to include the new agent
function updateIndexFile(agentId) {
  const indexPath = path.join(__dirname, '..', 'index.js');
  
  try {
    if (!fs.existsSync(indexPath)) {
      // Create index.js if it doesn't exist
      const initContent = `require('dotenv').config();\n\nmodule.exports = {\n    ${agentId}: require('./${agentId}')\n};\n`;
      fs.writeFileSync(indexPath, initContent);
      console.log(COLORS.green + `✅ 已创建 index.js 文件并添加助手: ${agentId}` + COLORS.reset);
      return;
    }
    
    let indexContent = fs.readFileSync(indexPath, 'utf8');
    
    // Check if the file already requires dotenv
    if (!indexContent.includes('require(\'dotenv\')')) {
      indexContent = 'require(\'dotenv\').config();\n\n' + indexContent;
    }
    
    // Extract the current module.exports object
    const moduleExportsMatch = indexContent.match(/module\.exports\s*=\s*\{([^}]*)\}/s);
    
    if (moduleExportsMatch) {
      const existingExports = moduleExportsMatch[1].trim();
      
      // Check if the agent is already in the exports
      if (!existingExports.includes(`${agentId}:`)) {
        // Add the new agent to the exports
        const newExports = existingExports ? 
          existingExports + `,\n    ${agentId}: require('./${agentId}')` :
          `\n    ${agentId}: require('./${agentId}')`;
        
        // Replace the old exports with the new ones
        const newIndexContent = indexContent.replace(
          /module\.exports\s*=\s*\{([^}]*)\}/s,
          `module.exports = {${newExports}\n}`
        );
        
        fs.writeFileSync(indexPath, newIndexContent);
        console.log(COLORS.green + `✅ 已更新 index.js 文件，添加新助手: ${agentId}` + COLORS.reset);
      } else {
        console.log(COLORS.yellow + `⚠️ 助手 ${agentId} 已存在于 index.js 文件中` + COLORS.reset);
      }
    } else {
      // If no module.exports format is found, append it
      const moduleAddition = `\nmodule.exports = {\n    ${agentId}: require('./${agentId}')\n};\n`;
      fs.writeFileSync(indexPath, indexContent + moduleAddition);
      console.log(COLORS.green + `✅ 已添加 module.exports 到 index.js 并包含助手: ${agentId}` + COLORS.reset);
    }
  } catch (error) {
    console.error(COLORS.red + '❌ 更新 index.js 文件时出错:' + COLORS.reset, error.message);
    throw error;
  }
}

// Function to validate ID format
function isValidId(id) {
  return /^[a-z0-9_]+$/.test(id);
}

// Main function to run the setup
async function runSetup() {
  console.log(COLORS.bright + COLORS.cyan + '=== TRTC AI Agent 创建工具 ===\n' + COLORS.reset);
  console.log('这个工具将帮助您创建一个新的AI助手配置。');
  console.log('在每一步中，按回车键使用默认值。\n');
  console.log(COLORS.yellow + '注意: 环境变量需要在 .env 文件中单独配置，请参考 env.example\n' + COLORS.reset);

  try {
    // List available templates
    console.log(COLORS.bright + '可用的配置模板:' + COLORS.reset);
    Object.keys(TEMPLATES).forEach(template => {
      console.log(`- ${template}: ${TEMPLATES[template].description}`);
    });
    console.log('');

    // Basic agent information
    const agentId = await promptWithValidation(
      '请输入您的助手唯一ID (例如: "customer_service")',
      '',
      isValidId,
      '❌ ID只能包含小写字母、数字和下划线!'
    );

    const agentName = await promptWithValidation(
      '请输入您的助手名称 (例如: "客服助手")',
      '',
      (val) => val.length > 0,
      '❌ 助手名称是必填项!'
    );

    // Ask if want to use a template
    const useTemplate = await promptWithValidation(
      '是否使用模板配置? (是/否)',
      '是',
      (val) => ['是', '否'].includes(val.toLowerCase()),
      '❌ 请输入 "是" 或 "否"'
    );

    let templateBase = TEMPLATES.default;
    if (useTemplate.toLowerCase() === '是') {
      const templateName = await promptWithValidation(
        '请选择模板',
        'default',
        (val) => Object.keys(TEMPLATES).includes(val),
        `❌ 模板必须是以下之一: ${Object.keys(TEMPLATES).join(', ')}`
      );
      templateBase = TEMPLATES[templateName];
    }

    // Collect agent configuration with improved categorization
    const config = {
      agentId,
      agentName,
      // Use the template as baseline and override with user inputs
      ...templateBase,
      // Override welcome message with agent name
      welcomeMessage: `您好，我是${agentName}。有什么可以帮您的吗？`
    };

    console.log(COLORS.bright + '\n=== 基础信息 ===' + COLORS.reset);
    config.description = await promptWithValidation('请输入助手描述', config.description);
    
    const capabilitiesStr = await promptWithValidation(
      '请输入助手能力 (逗号分隔, 例如: "语音交互,问答服务")', 
      config.capabilities.join(',')
    );
    config.capabilities = capabilitiesStr.split(',').map(cap => cap.trim());
    
    config.voiceType = await promptWithValidation('请输入语音类型描述', config.voiceType);
    config.personality = await promptWithValidation('请输入助手性格特点', config.personality);
    
    console.log(COLORS.bright + '\n=== 交互设置 ===' + COLORS.reset);
    config.welcomeMessage = await promptWithValidation('请输入欢迎语', config.welcomeMessage);
    
    const interruptModeInput = await promptWithValidation(
      '请输入打断模式 (1-3, 1:不可打断, 2:检测停顿时可打断, 3:随时可打断)',
      config.interruptMode.toString(),
      (val) => ['1', '2', '3'].includes(val),
      '❌ 打断模式必须是 1, 2 或 3'
    );
    config.interruptMode = parseInt(interruptModeInput);
    
    console.log(COLORS.bright + '\n=== 语音识别设置 ===' + COLORS.reset);
    config.language = await promptWithValidation('请输入语音识别语言模型', config.language);
    config.hotWords = await promptWithValidation('请输入热词列表及权重 (例如: "AI|6,助手|8")', config.hotWords);
    
    console.log(COLORS.bright + '\n=== LLM设置 ===' + COLORS.reset);
    config.llmType = await promptWithValidation('请输入LLM类型', config.llmType);
    
    const historyLengthInput = await promptWithValidation(
      '请输入历史上下文长度',
      config.historyLength.toString(),
      (val) => !isNaN(parseInt(val)) && parseInt(val) > 0,
      '❌ 历史上下文长度必须是正整数'
    );
    config.historyLength = parseInt(historyLengthInput);
    
    const timeoutInput = await promptWithValidation(
      '请输入LLM超时时间（秒）',
      config.timeout.toString(),
      (val) => !isNaN(parseInt(val)) && parseInt(val) > 0,
      '❌ 超时时间必须是正整数'
    );
    config.timeout = parseInt(timeoutInput);
    
    const streamingInput = await promptWithValidation(
      '是否启用流式响应? (是/否)',
      config.streaming ? '是' : '否',
      (val) => ['是', '否'].includes(val.toLowerCase()),
      '❌ 请输入 "是" 或 "否"'
    );
    config.streaming = streamingInput.toLowerCase() === '是';
    
    config.systemPrompt = await promptWithValidation('请输入系统提示词', config.systemPrompt);
    
    console.log(COLORS.bright + '\n=== TTS设置 ===' + COLORS.reset);
    config.ttsType = await promptWithValidation('请输入TTS提供商', config.ttsType);
    config.ttsApiUrl = await promptWithValidation('请输入TTS API URL', config.ttsApiUrl);
    config.ttsModel = await promptWithValidation('请输入TTS模型名称', config.ttsModel);
    
    const ttsSpeedInput = await promptWithValidation(
      '请输入TTS语速',
      config.ttsSpeed.toString(),
      (val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
      '❌ 语速必须是正数'
    );
    config.ttsSpeed = parseFloat(ttsSpeedInput);
    
    console.log(COLORS.bright + '\n=== 腾讯云设置 ===' + COLORS.reset);
    config.region = await promptWithValidation('请输入腾讯云区域', config.region);

    // Create directory structure if not exists
    const agentCardDir = path.join(__dirname, '..');
    const assetsDir = path.join(agentCardDir, 'assets');
    
    try {
      if (!fs.existsSync(assetsDir)) {
        fs.mkdirSync(assetsDir, { recursive: true });
        console.log(COLORS.green + '✅ 已创建资源目录' + COLORS.reset);
      }

      // Generate agent file
      const agentFilePath = path.join(agentCardDir, `${agentId}.js`);
      
      // Check if file already exists
      if (fs.existsSync(agentFilePath)) {
        const overwrite = await promptWithValidation(
          `文件 ${agentId}.js 已存在，是否覆盖? (是/否)`,
          '否',
          (val) => ['是', '否'].includes(val.toLowerCase()),
          '❌ 请输入 "是" 或 "否"'
        );
        
        if (overwrite.toLowerCase() !== '是') {
          console.log(COLORS.yellow + '⚠️ 操作已取消，未生成助手配置文件' + COLORS.reset);
          rl.close();
          return;
        }
      }
      
      fs.writeFileSync(agentFilePath, generateAgentTemplate(config));
      console.log(COLORS.green + `✅ 助手配置文件已创建: ${agentFilePath}` + COLORS.reset);

      // Create placeholder avatar if it doesn't exist
      const avatarPath = path.join(assetsDir, `${agentId}.png`);
      if (!fs.existsSync(avatarPath)) {
        console.log(COLORS.yellow + `⚠️ 注意: 您需要添加头像图片: ${avatarPath}` + COLORS.reset);
      }

      // Update index.js to include the new agent
      updateIndexFile(agentId);

      console.log(COLORS.bright + COLORS.green + '\n=== 创建完成 ===\n' + COLORS.reset);
      console.log(`您的助手 "${agentName}" 已成功配置，ID为 "${agentId}"。`);
      console.log(COLORS.cyan + '要启动服务器，请运行: npm start' + COLORS.reset);
      
    } catch (error) {
      console.error(COLORS.red + '❌ 创建文件时出错:' + COLORS.reset, error.message);
      throw error;
    }
    
  } catch (error) {
    console.error(COLORS.red + '❌ 设置过程中出错:' + COLORS.reset, error);
  } finally {
    rl.close();
  }
}

// Run the setup
runSetup();