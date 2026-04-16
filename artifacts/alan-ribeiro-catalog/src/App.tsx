import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PlayerProvider } from "@/contexts/PlayerContext";
import Home from "@/pages/Home";
import Admin from "@/pages/Admin";
import Vip from "@/pages/Vip";
import Artists from "@/pages/Artists";
import ArtistProfile from "@/pages/ArtistProfile";
import ArtistVip from "@/pages/ArtistVip";
import ArtistDashboard from "@/pages/ArtistDashboard";
import ArtistLogin from "@/pages/ArtistLogin";
import ArtistForgotPassword from "@/pages/ArtistForgotPassword";
import ArtistResetPassword from "@/pages/ArtistResetPassword";
import Demo from "@/pages/Demo";
import Cadastro from "@/pages/Cadastro";
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
      <Route path="/" component={Home} />
      <Route path="/cadastro" component={Cadastro} />
      <Route path="/artista/login" component={ArtistLogin} />
      <Route path="/artista/forgot" component={ArtistForgotPassword} />
      <Route path="/artista/reset/:token" component={ArtistResetPassword} />
      <Route path="/artista/dashboard" component={ArtistDashboard} />
      <Route path="/artistas" component={Artists} />
      <Route path="/a/:slug" component={ArtistProfile} />
      <Route path="/artista/:id/vip" component={ArtistVip} />
      <Route path="/artista/:id" component={ArtistProfile} />
      <Route path="/demo" component={Demo} />
      <Route path="/admin" component={Admin} />
      <Route path="/vip" component={Vip} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
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
