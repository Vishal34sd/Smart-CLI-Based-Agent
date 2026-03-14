import { Router } from "express";

const router = Router();

router.get("/github/client-id", (req, res) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    return res.status(500).json({ error: "GitHub client ID is not configured" });
  }

  return res.json({ client_id: clientId });
});

export default router;
