/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GA_MEASUREMENT_ID: string;
  readonly VITE_ENVIRONMENT?: string;
  readonly VITE_NON_PROD_SITE_PASSWORD?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}