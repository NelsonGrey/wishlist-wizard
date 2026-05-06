import AppRouter from "./AppRouter";
import EnvironmentPasswordGate from "./components/security/EnvironmentPasswordGate";

function App() {
  const environment = String(import.meta.env.VITE_ENVIRONMENT || import.meta.env.MODE || "development").toLowerCase();
  const nonProdPassword = String(import.meta.env.VITE_NON_PROD_SITE_PASSWORD || "");

  return (
    <EnvironmentPasswordGate environment={environment} requiredPassword={nonProdPassword}>
      <AppRouter />
    </EnvironmentPasswordGate>
  );
}

export default App;
