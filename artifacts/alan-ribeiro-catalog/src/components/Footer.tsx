import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Instagram, Phone, Mail, ShieldAlert, Award } from "lucide-react";

interface FooterSettings {
  suporteInstagram: string;
  suporteWhatsapp: string;
  suporteEmail: string;
  footerCopyright: string;
  footerFounderDescription: string;
  footerCopyrightProtection: string;
  footerPlatformTagline: string;
}

export function Footer() {
  const [settings, setSettings] = useState<FooterSettings>({
    suporteInstagram: "@Portaldoartista.oficial",
    suporteWhatsapp: "(21) 99589-7040",
    suporteEmail: "portaldoartistaoficial@gmail.com",
    footerCopyright: "© 2026 Portaldoartista.com – Todos os direitos reservados.",
    footerFounderDescription: "Portal desenvolvido e mantido por Alan Ribeiro, fundador do Portaldoartista.com e desenvolvedor de soluções digitais voltadas à valorização e profissionalização de artistas independentes.",
    footerCopyrightProtection: "Todo o conteúdo, identidade visual, estrutura da plataforma, códigos, layout, recursos e funcionalidades são protegidos pela legislação de direitos autorais. É proibida a reprodução, distribuição, modificação ou utilização total ou parcial sem autorização prévia.",
    footerPlatformTagline: "A maior plataforma de gestão de carreira para artistas da música."
  });

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        setSettings({
          suporteInstagram: data.suporteInstagram || "@Portaldoartista.oficial",
          suporteWhatsapp: data.suporteWhatsapp || "(21) 99589-7040",
          suporteEmail: data.suporteEmail || "portaldoartistaoficial@gmail.com",
          footerCopyright: data.footerCopyright || "© 2026 Portaldoartista.com – Todos os direitos reservados.",
          footerFounderDescription: data.footerFounderDescription || "Portal desenvolvido e mantido por Alan Ribeiro, fundador do Portaldoartista.com e desenvolvedor de soluções digitais voltadas à valorização e profissionalização de artistas independentes.",
          footerCopyrightProtection: data.footerCopyrightProtection || "Todo o conteúdo, identidade visual, estrutura da plataforma, códigos, layout, recursos e funcionalidades são protegidos pela legislação de direitos autorais. É proibida a reprodução, distribuição, modificação ou utilização total ou parcial sem autorização prévia.",
          footerPlatformTagline: data.footerPlatformTagline || "A maior plataforma de gestão de carreira para artistas da música."
        });
      })
      .catch((err) => console.error("Erro ao carregar dados do rodapé:", err));
  }, []);

  const formatWhatsappLink = (numStr: string) => {
    const cleaned = numStr.replace(/\D/g, "");
    const ddd = cleaned.length >= 10 ? cleaned : "55" + cleaned;
    return `https://wa.me/${ddd}`;
  };

  return (
    <footer className="relative mt-20 border-t border-border/40 bg-card/30 backdrop-blur-md overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
          {/* Coluna 1: Branding */}
          <div className="space-y-4">
            <Link href="/" className="inline-block">
              <h3 className="text-xl font-extrabold tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-primary to-yellow-200">
                Portaldoartista.com
              </h3>
            </Link>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-sm">
              {settings.footerPlatformTagline}
            </p>
            <p className="text-[11px] text-muted-foreground/60 pt-4">
              {settings.footerCopyright}
            </p>
          </div>

          {/* Coluna 2: Autor e Proteção */}
          <div className="space-y-4">
            <div className="flex items-start gap-2.5">
              <Award className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground/80 leading-relaxed">
                {settings.footerFounderDescription}
              </p>
            </div>
            
            <div className="flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-yellow-500/80 shrink-0 mt-0.5" />
              <p className="text-[10px] text-muted-foreground/50 leading-relaxed italic">
                {settings.footerCopyrightProtection}
              </p>
            </div>
          </div>

          {/* Coluna 3: Contatos e Links */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-foreground uppercase tracking-wider">
              Suporte & Contato
            </h4>
            
            <ul className="space-y-2.5">
              <li>
                <a
                  href={`https://instagram.com/${settings.suporteInstagram.replace("@", "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors inline-flex"
                >
                  <Instagram className="w-4 h-4 text-pink-500" />
                  <span>Instagram: {settings.suporteInstagram}</span>
                </a>
              </li>
              <li>
                <a
                  href={formatWhatsappLink(settings.suporteWhatsapp)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors inline-flex"
                >
                  <Phone className="w-4 h-4 text-green-500" />
                  <span>WhatsApp: {settings.suporteWhatsapp}</span>
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${settings.suporteEmail}`}
                  className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors inline-flex"
                >
                  <Mail className="w-4 h-4 text-primary" />
                  <span>E-mail: {settings.suporteEmail}</span>
                </a>
              </li>
            </ul>

            <div className="flex flex-wrap gap-x-4 gap-y-1.5 pt-4 border-t border-border/20 text-xs">
              <Link href="/" className="text-muted-foreground hover:text-foreground">Início</Link>
              <Link href="/artistas" className="text-muted-foreground hover:text-foreground">Artistas</Link>
              <Link href="/artista/login?tab=cadastro" className="text-muted-foreground hover:text-foreground">Cadastre-se</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
