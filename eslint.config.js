import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist/**", "api/**", "supabase/**"] },
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { ecmaVersion: "latest", sourceType: "module", ecmaFeatures: { jsx: true } }
    },
    plugins: { "@typescript-eslint": tseslint.plugin, "react-hooks": reactHooks },
    rules: {
      "no-debugger": "error",
      "no-constant-condition": "error",
      "eqeqeq": ["error", "always", { "null": "ignore" }]
    }
  }
);
