import { ApolloClient, ApolloLink, InMemoryCache, Observable } from "@apollo/client/core";
import { SchemaLink } from "@apollo/client/link/schema";
import { createSchema, memoryStorage, type TriageStorage } from "./schema";

const STORAGE_KEY = "painel-vuln:triagem";

/** Guarda a triagem no navegador para a demo sobreviver a um F5. Falha em silêncio (aba anônima etc.). */
export const localTriageStorage: TriageStorage = {
  load() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    } catch {
      return {};
    }
  },
  save(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      /* sem armazenamento: segue só em memória */
    }
  },
};

/** Simula a latência de rede, para os estados de carregamento aparecerem na demo. */
const latency = (ms: number) =>
  new ApolloLink((op, forward) => new Observable((obs) => {
    let sub: { unsubscribe(): void } | undefined;
    const t = setTimeout(() => (sub = forward(op).subscribe(obs)), ms);
    return () => { clearTimeout(t); sub?.unsubscribe(); };
  }));

/**
 * O "servidor" GraphQL roda no próprio navegador (SchemaLink), para o projeto funcionar no GitHub Pages.
 * Para usar uma API real basta trocar o SchemaLink por um HttpLink({ uri }) — queries e componentes não mudam.
 */
export function createApolloClient(opts: { storage?: TriageStorage; latencyMs?: number } = {}) {
  const schemaLink = new SchemaLink({ schema: createSchema({ storage: opts.storage ?? memoryStorage() }) });
  const ms = opts.latencyMs ?? 0;
  return new ApolloClient({
    link: ms > 0 ? ApolloLink.from([latency(ms), schemaLink]) : schemaLink,
    cache: new InMemoryCache({
      typePolicies: { Finding: { keyFields: ["id"] }, Project: { keyFields: ["id"] } },
    }),
  });
}
