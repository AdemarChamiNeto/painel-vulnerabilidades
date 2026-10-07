import pluginVue from "eslint-plugin-vue";
import { defineConfigWithVueTs, vueTsConfigs } from "@vue/eslint-config-typescript";

export default defineConfigWithVueTs(
  { ignores: ["dist", "coverage"] },
  pluginVue.configs["flat/recommended"],
  vueTsConfigs.recommended,
  {
    rules: {
      "vue/multi-word-component-names": "off",
      "vue/max-attributes-per-line": "off",
      "vue/singleline-html-element-content-newline": "off",
      "vue/html-self-closing": "off",
      "vue/multiline-html-element-content-newline": "off",
    },
  },
  // nos testes o resultado do GraphQL é dinâmico; tipar cada query ali só adiciona ruído
  { files: ["tests/**"], rules: { "@typescript-eslint/no-explicit-any": "off" } },
);
