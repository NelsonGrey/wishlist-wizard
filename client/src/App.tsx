import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Dashboard from "@/pages/Dashboard";
import WishlistDetail from "@/pages/WishlistDetail";
import SharedWishlist from "@/pages/SharedWishlist";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ExtensionPage from "@/pages/ExtensionPage";
import Notifications from "@/pages/Notifications";
import MobileAppDemo from "@/pages/MobileAppDemo";
import ArVisualizerDemo from "@/pages/ArVisualizerDemo";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/wishlist/:id" component={WishlistDetail} />
      <Route path="/shared/:shareId" component={SharedWishlist} />
      <Route path="/extension" component={ExtensionPage} />
      <Route path="/extension-welcome" component={ExtensionPage} />
      <Route path="/notifications" component={Notifications} />
      <Route path="/mobile-demo" component={MobileAppDemo} />
      <Route path="/ar-visualizer" component={ArVisualizerDemo} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
