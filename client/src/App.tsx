import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { BrandingBadge } from "@/components/branding-badge";
import { FloatingParticles } from "@/components/floating-particles";
import backgroundImage from "@assets/generated_images/tech_gradient_waves_background.png";

import Dashboard from "@/pages/dashboard";
import Admin from "@/pages/admin";
import History from "@/pages/history";

import NotFound from "@/pages/not-found";

function AppContent() {
  return (
    <>
      {/* Fixed Background Image */}
      <div 
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: `url(${backgroundImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed'
        }}
      />
      
      <div className="min-h-screen flex flex-col relative z-10">
        <FloatingParticles />
        <Header />
        <div className="flex-1 relative z-10">
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/history" component={History} />
            <Route path="/admin" component={Admin} />
            <Route component={NotFound} />
          </Switch>
        </div>
        <Footer />
      </div>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <AppContent />
        <BrandingBadge />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
