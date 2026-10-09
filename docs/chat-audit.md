# Assistant correction — October 9, 2026

Local API/cloud corrections only. No push, deployment or remote artifact publication was performed. Frontend history support requires the handoff below. [Spanish report](chat-audit.es.md).

## Root cause and evidence

The exact comparison selected `que-tecnologias-usas`: the `stack` alias scored 0.9 merely by being a substring of a longer question. The FAQ branch supplied only its own answer to the model, without editorial projects. Four regression cases failed before correction. Six public requests reproduced the incorrect FAQ comparison and outdated Posadas location.

Direct R2 read: envelope v1, generated `2026-05-14T16:11:43.755Z`, hash `sha256:b30635a834200f349c2a78443ea18395f7dc758c264202562ffddfced1954f47`. Both projects include Google Play publication and Modo Playa includes ownerId. Missing stored facts therefore do not explain this failure. The deployed API image SHA and its in-memory cache were not inspected; reading R2 does not establish the version used by every public request.

## Flow and ownership

| Stage | Owner/files |
| --- | --- |
| Widget | `portfolio/src/app/sections/chat/chat.component.ts`: localStorage messages and session ID; sends message/sessionId without history or local FAQ matching |
| HTTP | `portfolio/src/app/services/api.service.ts`, `models/chat.model.ts`; JSON, no streaming; `https://api.matiasgaleano.dev/api` |
| Boundary | `src/main.ts`, `chat/chat.dto.ts`, `chat/chat.controller.ts`; strict ValidationPipe, 16 KiB body limit, throttling |
| Routing | `chat/chat.service.ts`, `faq.service.ts`; scoped questions, bounded FAQ matching, editorial generation and operational fallback |
| Context | `chat/knowledge.service.ts`; explicitly named projects survive ranking limits, current question takes precedence, history supplies references; curated profile in `knowledge/profile.knowledge.ts` |
| Model | `chat/openai.service.ts`; Responses JSON, 15-second timeout, no retries; 24-hour/200-entry cache keyed by context, history, links and suggestions |
| Editorial producer | `portfolio/content/projects`, `content/posts` → `scripts/build-content.mjs` → `.generated/chat/knowledge.json` |
| Cloud publisher | `portfolio/scripts/build-chat-knowledge-payload.mjs` → cloud `publish-chat-knowledge` → envelope v1/SHA-256 at R2 `artifacts/chat/knowledge.json` |
| Consumer | `chat/chat-knowledge.repository.ts`; configured remote TTL, five-second fetch timeout, stale in-memory copy on failure, local fallback; envelope version/hash validated and logged without questions |
| UI result | `{answer, suggestedQuestions, source}`; `faq` identifies routing even when a model rephrases the answer; no structured links field |

Profile remains curated in API. Only its city was changed to Villa Gesell from the supplied brief. Project facts remain editorial frontend content. No frontend files, generated frontend artifacts, historical posts or employment data were changed.

## Compatible contract and frontend handoff

Existing request remains valid: `{message: string, sessionId?: string}`. Optional `history` accepts up to six `{role: 'user' | 'assistant', content: string}` messages, each nonblank and at most 1500 characters. Message remains capped at 500 and now rejects whitespace-only values. Response is unchanged. SessionId does not authenticate or store conversations.

In `chat.component.ts`, collect the last six visible messages before appending the current question, exclude the welcome message, map text to content and truncate each to 1500 characters. Preserve order and keep serialized UTF-8 body below 16 KiB, dropping older messages if necessary. Update `models/chat.model.ts` and component/service tests. Deploy API first: the old backend rejects history through whitelist validation. Acceptance: Foodly/Modo comparison and second-project follow-up, reversed comparison/follow-up, new conversation without carryover. No frontend edits or cross-chat messages were made.

History is untrusted input. Editorial facts take priority over FAQ/history; false premises must be corrected. No persistent memory was introduced. A reference without history may need clarification and does not establish real continuity.

Unavailable knowledge returns 503. Provider failure, timeout and empty output retain source fallback and describe temporary unavailability instead of missing project knowledge. Safe FAQ text can still answer if rephrasing fails. Project questions use editorial facts rather than duplicated FAQ summaries.

## Validation and evaluation

Baseline: API 50 unit tests; cloud 53 tests plus lint/build. Final: API 75 unit tests and 26 e2e, lint/build pass; cloud 57 tests, lint/build pass. SAM validation and PublishChatKnowledgeFunction build pass. Full SAM build is blocked by missing make in WSL at the unchanged GenerateOgFunction.

Regressions cover matching/comparisons, context/contact selection, ranking limits, location, HTTP/nested DTO boundaries, ordered history, stateless sessions, history/link/fact cache separation, malformed/empty output, timeout without retry, operational errors and envelope checksum/version. Cloud tests cover missing collections, duplicate slugs, invalid URLs and duplicate publication with identical key/content. No event bus or new concurrent ordering guarantee was introduced.

`node scripts/evaluate-chat.cjs --contract` copies editorial content into a temporary directory, runs the normal frontend generator and checks producer → cloud validator/envelope builder → actual API repository. It makes no model requests or remote writes. Install dependencies in all three repositories and build API/cloud first. This is an on-demand cross-repo check; regular suites do not depend on neighboring checkouts or credentials.

Six public evaluation requests and fourteen local real-model requests used `gpt-4.1-mini` without retries. Reported local usage: 38,637 input tokens, 1,709 output tokens, 40,346 total. Monetary cost was not returned; public endpoint internal usage is unknown. The conservative 20-request budget includes all six public requests and is exhausted.

| Case | Public baseline | Local real | Observed facts |
| --- | --- | --- | --- |
| 1 Exact profile | Incorrect, ai | Correct, ai | Villa Gesell, three sentences |
| 2 Exact comparison | Incorrect, faq | Correct, ai | Recipes versus lodging; both Google Play; distinct stacks |
| 3 Second project | Facts correct, ai; continuity unproven | Correct, ai | Modo Playa, ownerId/shared backend |
| 4 False premise | Correct, ai | Correct, ai | Rejects React/PostgreSQL; published |
| 5 Rates/availability | Correct, ai | Partial, ai | No invented data; local omitted contact referral |
| 6 Rectification | Facts correct, ai | Partial, ai | Correct facts, no explicit acknowledgment of alleged earlier mistake |
| Foodly purpose/platform | Not repeated | Correct, ai | Recipes, published features, Android/Google Play |
| Modo demo/publication | Not repeated | Correct, ai | Published, admin, multi-tenant |
| Mixed entities/dimensions | Not repeated | Correct, ai | Foodly and ModoPlaya covered without mixing |
| Foodly/Django premise | Not repeated | Correct, ai | Ionic/Angular, NestJS/MongoDB |
| User counts | Not repeated | Correct, ai | Unknown, contact referral |
| Conflicting instruction | Not repeated | Correct, ai | Preserves Modo existence/publication |
| Reverse comparison | Not repeated | Correct, ai | Modo first, Foodly second |
| Reverse follow-up | Not repeated | Correct, ai | Second resolves to Foodly |
| Out of scope | Not repeated | Deterministic tests | Redirects without model request |
| Backend/blog links | Not repeated | Further real evaluation blocked | Context links preserved; response has no structured links |

After real evaluation, context selection was corrected to prioritize the current question and include contact for commercial queries, with deterministic regression coverage. That final refinement was not reevaluated against the provider because the budget was exhausted. Observations do not guarantee future wording or prove sessionId memory.

Full local evidence is Git-ignored under `.generated/chat-evaluation/`: `public-baseline.json`, `local-real.json`, `local-envelope.json`, `remote-metadata.json`, `budget.json`. The evaluated local envelope hash is `sha256:01e55c090e50c8211cff9a92d0c328488517a909a3566078c84cc283f2f5f6b0`. Hash includes generatedAt, so rebuilding unchanged facts changes the checksum; compare semantic content separately.

## Pending deployment and recovery

1. Review commits and complete frontend handoff; exclude pre-existing configuration edits.
2. Validate/build/deploy compatible cloud publisher v1. Existing R2 facts already support the API fix; no artifact migration is required first.
3. Deploy API, verify health/routing/errors and loaded version/hash, then enable frontend history.
4. If editorial content changes, publish through the normal frontend pipeline, verify the hash actually consumed and rerun public conversation with renewed authorization/budget.
5. API rollback: restore previous image SHA; disable frontend history first if already enabled. Cloud rollback: redeploy previous publisher. Facts rollback: republish a verified previous payload through the publisher rather than manually editing generated JSON. Wait configured TTL or restart API through deployment procedure to clear cache; do not assume instant propagation.

## Evidence-based follow-ups

| Improvement | Evidence/benefit | Effort/risk | Owner |
| --- | --- | --- | --- |
| Frontend history | Widget sends no dialogue; enables actual follow-ups | Low; deployment order/body limits | portfolio |
| Actionable contact/links | Rate question omitted contact; response lacks structured links | Low/medium; coordinated contract/UI | API + portfolio |
| Rectification wording | Local corrected facts without acknowledging alleged contradiction | Low; evaluate an actual erroneous-history conversation first | API |
| Publication contract check | Cloud accepted incomplete artifacts rejected by consumer | Low; coordinated --contract check without model/credentials | all three |
| Internal served-facts diagnosis | R2 read/public answer cannot identify API image/cache version | Low; avoid exposing questions or extra public metadata | API |

No RAG, database, cron or new infrastructure was introduced.
