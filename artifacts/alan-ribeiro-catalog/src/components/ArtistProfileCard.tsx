import { motion } from "framer-motion";
import { Music, MapPin, Instagram, Mail, Phone, Globe } from "lucide-react";

interface ArtistProfileCardProps {
  name: string;
  profissao?: string;
  cidade?: string;
  contato?: string;
  email?: string;
  instagram?: string;
  tiktok?: string;
  spotify?: string;
  capaUrl?: string;
  bannerUrl?: string;
  fonte?: string;
  cor?: string;
  layout?: string;
  compact?: boolean;
}

export function ArtistProfileCard({
  name,
  profissao,
  cidade,
  contato,
  email,
  instagram,
  tiktok,
  spotify,
  capaUrl,
  bannerUrl,
  fonte = "Arial",
  cor = "#f5d76e",
  layout,
  compact = false,
}: ArtistProfileCardProps) {
  const bgStyle = layout || "linear-gradient(135deg, #000, #0a0a0a, #1a1a00)";

  if (compact) {
    return (
      <div
        className="relative overflow-hidden rounded-2xl border border-border/40"
        style={{ background: bgStyle }}
      >
        {/* Banner */}
        {bannerUrl ? (
          <div className="h-48 md:h-64 overflow-hidden">
            <img src={bannerUrl} alt="" className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="h-32 md:h-40" style={{ background: bgStyle }} />
        )}

        {/* Artist info */}
        <div className="px-4 pb-4 -mt-12 relative z-10">
          <div className="flex items-end gap-4">
            <div className="w-24 h-24 md:w-28 md:h-28 rounded-full overflow-hidden border-4 border-background shadow-xl flex-shrink-0 bg-card/50 flex items-center justify-center">
              {capaUrl ? (
                <img src={capaUrl} alt={name} className="w-full h-full object-cover" />
              ) : (
                <Music className="w-10 h-10 text-primary" />
              )}
            </div>
            <div className="pb-1">
              <h1
                className="text-2xl md:text-3xl font-extrabold text-foreground"
                style={{ fontFamily: fonte, color: cor }}
              >
                {name}
              </h1>
              {profissao && (
                <p className="text-sm text-muted-foreground">{profissao}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Full version — matching the reference layout
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-3xl mx-auto"
    >
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-sm uppercase tracking-wider text-muted-foreground mb-1">Portal do Artista</h2>
        {profissao && (
          <p className="text-lg font-medium" style={{ color: cor, opacity: 0.7 }}>{profissao}</p>
        )}
        <h1
          className="text-3xl md:text-5xl font-extrabold text-foreground"
          style={{ fontFamily: fonte, color: cor }}
        >
          {name}
        </h1>
      </div>

      {/* Banner / Cover */}
      <div className="w-full h-48 md:h-64 rounded-2xl overflow-hidden mb-6 bg-card/30 border border-border/40">
        {bannerUrl ? (
          <img src={bannerUrl} alt="" className="w-full h-full object-cover" />
        ) : capaUrl ? (
          <img src={capaUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ background: bgStyle }}>
            <Music className="w-20 h-20 text-primary/30" />
          </div>
        )}
      </div>

      {/* Profile photo */}
      <div className="flex justify-center -mt-16 relative z-10 mb-6">
        <div className="w-28 h-28 md:w-32 md:h-32 rounded-full overflow-hidden border-4 border-background shadow-2xl bg-card/50 flex items-center justify-center">
          {capaUrl ? (
            <img src={capaUrl} alt={name} className="w-full h-full object-cover" />
          ) : (
            <Music className="w-12 h-12 text-primary" />
          )}
        </div>
      </div>

      {/* Contact cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
        {contato && (
          <div className="flex items-start gap-3 p-3 rounded-xl bg-card/50 border border-border/40">
            <Phone className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">Telefone / WhatsApp</p>
              <p className="text-sm text-foreground break-all">{contato}</p>
            </div>
          </div>
        )}
        {email && (
          <div className="flex items-start gap-3 p-3 rounded-xl bg-card/50 border border-border/40">
            <Mail className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="text-sm text-foreground break-all">{email}</p>
            </div>
          </div>
        )}
        {instagram && (
          <div className="flex items-start gap-3 p-3 rounded-xl bg-card/50 border border-border/40">
            <Instagram className="w-5 h-5 text-pink-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">Instagram</p>
              <a
                href={`https://instagram.com/${instagram.replace("@", "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-pink-500 hover:underline break-all"
              >
                @{instagram.replace("@", "")}
              </a>
            </div>
          </div>
        )}
        {tiktok && (
          <div className="flex items-start gap-3 p-3 rounded-xl bg-card/50 border border-border/40">
            <Globe className="w-5 h-5 text-white flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">TikTok</p>
              <a
                href={`https://tiktok.com/@${tiktok.replace("@", "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-white hover:underline break-all"
              >
                @{tiktok.replace("@", "")}
              </a>
            </div>
          </div>
        )}
        {spotify && (
          <div className="flex items-start gap-3 p-3 rounded-xl bg-card/50 border border-border/40">
            <Globe className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">Spotify</p>
              <a
                href={spotify.startsWith("http") ? spotify : `https://open.spotify.com/${spotify}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-green-500 hover:underline break-all"
              >
                {spotify}
              </a>
            </div>
          </div>
        )}
        {cidade && (
          <div className="flex items-start gap-3 p-3 rounded-xl bg-card/50 border border-border/40">
            <MapPin className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">Cidade</p>
              <p className="text-sm text-foreground">{cidade}</p>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
