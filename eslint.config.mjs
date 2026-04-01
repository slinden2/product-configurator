import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = [
  { ignores: ["playwright-report/**", "test-results/**", "e2e/.auth/**"] },
  ...nextCoreWebVitals,
  {
    rules: {
      // These rules flag valid patterns (syncing local state with props,
      // standard React Hook Form handleSubmit usage). Disable globally.
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/refs": "off",
    },
  },
  {
    files: ["**/*.test.{ts,tsx}", "test/**/*.{ts,tsx}"],
    rules: {
      "react-hooks/globals": "off",
    },
  },
];

export default eslintConfig;
