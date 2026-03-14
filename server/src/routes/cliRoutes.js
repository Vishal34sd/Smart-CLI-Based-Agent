import { Router } from "express";
import { requireApiAuth } from "../middleware/auth.js";
import { addMessage, getMe, getMessages, initConversation, updateTitle } from "../controllers/cliController.js";
import { generateAgentPlan, respond } from "../controllers/aiController.js";

const router = Router();

router.use(requireApiAuth);

router.get("/me", getMe);
router.post("/conversations/init", initConversation);
router.post("/messages", addMessage);
router.get("/messages", getMessages);
router.patch("/conversations/:id/title", updateTitle);
router.post("/ai/respond", respond);
router.post("/ai/agent", generateAgentPlan);

export default router;
