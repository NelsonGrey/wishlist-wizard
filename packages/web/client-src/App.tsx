import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect } from "react";
import { initGA } from "./lib/analytics";
import { initFirebase } from "./lib/firebase";
import { AuthProvider } from "./contexts/AuthContext";
import ComingSoon from "./pages/ComingSoon";

function App() {
  // Initialize Google Analytics when app loads
  useEffect(() => {
    // Initialize GA if key is provided (no warning if missing)
    initGA();

    // Firebase initialization is now handled by AuthProvider
    // to ensure proper Auth initialization timing
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <ComingSoon />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
