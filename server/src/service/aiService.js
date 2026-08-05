import { AIService } from "../cli/ai/googleService.js";

export const getAIService = () => {
  return new AIService();
};
