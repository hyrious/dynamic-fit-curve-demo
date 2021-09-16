import reactRefresh from "@vitejs/plugin-react-refresh";
import { defineConfig } from "vite";
import importToCDN, { autoComplete } from "vite-plugin-cdn-import";

export default defineConfig({
    plugins: [
        importToCDN({ modules: [autoComplete("react"), autoComplete("react-dom")] }),
        reactRefresh(),
    ],
});
