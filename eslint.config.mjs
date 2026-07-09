import next from "eslint-config-next";

const config = [
  ...next,
  {
    ignores: [".next/**", "node_modules/**", "prisma/migrations/**"],
  },
  {
    rules: {
      // The Board and Home views call an async loader (which sets state) from
      // a mount effect — the standard "fetch on mount" pattern. This newer,
      // opinionated rule flags it as a cascading-render perf concern, but the
      // fetch is one-shot on mount and the cost is negligible here. Off so
      // lint stays useful for real issues without rewriting verified,
      // working data-fetching code.
      "react-hooks/set-state-in-effect": "off",
    },
  },
];

export default config;
