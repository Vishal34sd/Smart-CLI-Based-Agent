import prisma from "../db/prisma.js";

const parseAuthHeader = (value) => {
  if (!value || typeof value !== "string") return null;
  const [scheme, credentials] = value.split(" ");
  if (!scheme || !credentials) return null;
  if (scheme.toLowerCase() !== "bearer") return null;
  return credentials;
};

export const requireApiAuth = async (req, res, next) => {
  try {
    const token = parseAuthHeader(req.headers.authorization);
    if (!token) {
      return res.status(401).json({ error: "Missing or invalid Authorization header" });
    }

    const session = await prisma.session.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!session || !session.user) {
      return res.status(401).json({ error: "Invalid session" });
    }

    if (session.expiresAt && session.expiresAt.getTime() <= Date.now()) {
      return res.status(401).json({ error: "Session expired" });
    }

    req.user = session.user;
    req.session = session;
    req.accessToken = token;

    return next();
  } catch (error) {
    return next(error);
  }
};
