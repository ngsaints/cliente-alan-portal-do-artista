import { Switch, Route, Router as WouterRouter } from "wouter";
import { useEffect } from "react";
import Clarity from "@microsoft/clarity";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PlayerProvider } from "@/contexts/PlayerContext";
import Home from "@/pages/Home";
import Landing from "@/pages/Landing";
import Admin from "@/pages/Admin";
import Vip from "@/pages/Vip";
import Artists from "@/pages/Artists";
import ArtistProfile from "@/pages/ArtistProfile";
import ArtistVip from "@/pages/ArtistVip";
import ArtistDashboard from "@/pages/ArtistDashboard";
import ArtistGallery from "@/pages/ArtistGallery";
import ArtistLogin from "@/pages/ArtistLogin";
import ArtistForgotPassword from "@/pages/ArtistForgotPassword";
import ArtistResetPassword from "@/pages/ArtistResetPassword";
import Demo from "@/pages/Demo";
import Cadastro from "@/pages/Cadastro";
import Planos from "@/pages/Planos";
import CrmPage from "@/pages/CrmPage";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/explorar" component={Home} />
      <Route path="/planos" component={Planos} />
      <Route path="/cadastro" component={Cadastro} />
      <Route path="/artista/login" component={ArtistLogin} />
      <Route path="/artista/forgot" component={ArtistForgotPassword} />
      <Route path="/artista/reset/:token" component={ArtistResetPassword} />
      <Route path="/artista/dashboard" component={ArtistDashboard} />
      <Route path="/artista/crm" component={CrmPage} />
      <Route path="/artistas" component={Artists} />
      <Route path="/admin" component={Admin} />
      <Route path="/demo" component={Demo} />
      <Route path="/:slug" component={ArtistProfile} />
      <Route path="/:slug/galeria" component={ArtistGallery} />
      <Route path="/artista/:id/vip" component={ArtistVip} />
      <Route path="/artista/:id" component={ArtistProfile} />
      <Route path="/vip" component={Vip} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        // 1. Microsoft Clarity
        if (data.clarityProjectId) {
          Clarity.init(data.clarityProjectId);
          console.log("Microsoft Clarity inicializado com o Project ID:", data.clarityProjectId);
        }

        // 2. Meta / Facebook Pixel
        if (data.pixelMetaId && !(window as any).fbq) {
          try {
            const metaScript = document.createElement("script");
            metaScript.innerHTML = `
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '${data.pixelMetaId}');
              fbq('track', 'PageView');
            `;
            document.head.appendChild(metaScript);
            console.log("Meta Pixel inicializado:", data.pixelMetaId);
          } catch (e) {
            console.error("Erro ao inicializar Meta Pixel:", e);
          }
        }

        // 3. Google Analytics / Tag Manager
        if (data.pixelGoogleId && !document.getElementById("google-pixel-script")) {
          try {
            const gScript = document.createElement("script");
            gScript.id = "google-pixel-script";
            gScript.async = true;
            gScript.src = `https://www.googletagmanager.com/gtag/js?id=${data.pixelGoogleId}`;
            document.head.appendChild(gScript);

            const gInit = document.createElement("script");
            gInit.innerHTML = `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${data.pixelGoogleId}');
            `;
            document.head.appendChild(gInit);
            console.log("Google Tag Manager / Analytics inicializado:", data.pixelGoogleId);
          } catch (e) {
            console.error("Erro ao inicializar Google Tag:", e);
          }
        }

        // 4. TikTok Pixel
        if (data.pixelTiktokId && !(window as any).ttq) {
          try {
            const ttScript = document.createElement("script");
            ttScript.innerHTML = `
              !function (w, d, t) {
                w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq.methods[i],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
                ttq.load('${data.pixelTiktokId}');
                ttq.page();
              }(window, document, 'ttq');
            `;
            document.head.appendChild(ttScript);
            console.log("TikTok Pixel inicializado:", data.pixelTiktokId);
          } catch (e) {
            console.error("Erro ao inicializar TikTok Pixel:", e);
          }
        }

        // 5. Custom Head Script
        if (data.pixelCustomHeadScript && !document.getElementById("custom-head-pixel-script")) {
          try {
            const range = document.createRange();
            range.selectNode(document.head);
            const fragment = range.createContextualFragment(data.pixelCustomHeadScript);
            const container = document.createElement("div");
            container.id = "custom-head-pixel-script";
            container.style.display = "none";
            container.appendChild(fragment);
            document.head.appendChild(container);
          } catch (e) {
            console.error("Erro ao injetar script customizado no head:", e);
          }
        }

        // 6. Custom Body Script
        if (data.pixelCustomBodyScript && !document.getElementById("custom-body-pixel-script")) {
          try {
            const range = document.createRange();
            range.selectNode(document.body);
            const fragment = range.createContextualFragment(data.pixelCustomBodyScript);
            const container = document.createElement("div");
            container.id = "custom-body-pixel-script";
            container.style.display = "none";
            container.appendChild(fragment);
            document.body.appendChild(container);
          } catch (e) {
            console.error("Erro ao injetar script customizado no body:", e);
          }
        }
      })
      .catch((err) => console.error("Erro ao carregar configurações para inicializar o rastreamento:", err));
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <PlayerProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
        </PlayerProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
