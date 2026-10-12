import { createApp, h, provide } from "vue";
import { createPinia } from "pinia";
import { DefaultApolloClient } from "@vue/apollo-composable";
import App from "./App.vue";
import { createApolloClient, localTriageStorage } from "./graphql/client";
import { createAppI18n, saveLocale, initialLocale } from "./i18n";
import "./styles.css";
import { initConsent } from "./consent";

const locale = initialLocale();
saveLocale(locale);
const apollo = createApolloClient({ storage: localTriageStorage, latencyMs: 250 });

createApp({
  setup: () => provide(DefaultApolloClient, apollo),
  render: () => h(App),
})
  .use(createPinia())
  .use(createAppI18n(locale))
  .mount("#app");

// GA4/Clarity só depois do aceite (e só se os IDs estiverem configurados no build)
initConsent(`${import.meta.env.BASE_URL}privacidade.html`);
