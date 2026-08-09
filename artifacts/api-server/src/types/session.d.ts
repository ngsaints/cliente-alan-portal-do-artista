import "express-session";

declare module "express-session" {
  interface SessionData {
    logado: boolean;
    isAdmin?: boolean;
    artistId?: number;
    artistEmail?: string;
    artistName?: string;
    vipLogado?: boolean;
  }
}