export {}; 

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        name?: string | null;
        email?: string | null;
        image?: string | null;
      };
      session?: {
        id: string;
        expiresAt?: Date | null;
      };
      accessToken?: string;
    }
  }
}
