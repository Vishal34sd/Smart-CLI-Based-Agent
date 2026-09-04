import { ChatService } from "../service/chatService.js";
import { getAIService } from "../service/aiService.js";
import { enableTools, getEnabledTools, resetTools } from "../config/toolConfig.js";
import { generateApplicationPlan } from "../config/agentConfig.js";

const chatService = new ChatService();

export const respond = async (req, res, next) => {
  try {
    const { conversationId, mode, toolIds, provider, model } = req.body || {};

    if (!conversationId) {
      return res.status(400).json({ error: "conversationId is required" });
    }

    const messages = await chatService.getMessages(conversationId);
    const aiMessages = chatService.formatMessageForAI(messages);

    const modelConfig = provider || model ? { provider, model } : null;
    const aiService = getAIService(modelConfig);

    let tools;
    if (mode === "tool") {
      resetTools();
      if (Array.isArray(toolIds)) {
        enableTools(toolIds);
      }
      tools = getEnabledTools(aiService.provider);
    }

    const result = await aiService.sendMessage(aiMessages, null, tools);

    await chatService.addMessage(conversationId, "assistant", result.content);

    return res.json({
      content: result.content,
      toolCalls: result.toolCalls || [],
      toolResults: result.toolResults || [],
      model: aiService.getDisplayName(),
    });
  } catch (error) {
    return next(error);
  }
};

export const generateAgentPlan = async (req, res, next) => {
  try {
    const { description, provider, model } = req.body || {};

    if (!description || typeof description !== "string") {
      return res.status(400).json({ error: "description is required" });
    }

    const modelConfig = provider || model ? { provider, model } : null;
    const aiService = getAIService(modelConfig);
    const application = await generateApplicationPlan(description, aiService);

    return res.json({ application, model: aiService.getDisplayName() });
  } catch (error) {
    return next(error);
  }
};
