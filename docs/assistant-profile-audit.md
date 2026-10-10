# Assistant profile and response audit

Local review on October 9, 2026, following the editorial audit recorded in `chat-audit.md`. Branches: API `feature/assistant-profile-consistency`, frontend `feature/assistant-conversation`. Changes remain uncommitted, unpushed and undeployed. Cloud is unchanged.

## Findings and corrections

| Finding | Correction |
| --- | --- |
| Substring ranking did not reliably retrieve employment for «trabajás»; competing posts could displace it. | Employment intent and normalized variants select the relevant profile before the four-item limit. |
| «Boreal IT for Comafi» did not distinguish contractual employment from daily work. | Comafi comes first; Boreal IT is explicitly the employing consultancy. Domain: mutual funds (Fondos Comunes de Inversión). |
| FAQ and context duplicated biography and stack; the prompt imposed another incomplete list. | `knowledge/professional-profile.ts` holds professional texts shared by FAQ and context. The fixed prompt whitelist is removed. |
| Confirmed skills were missing and professional AWS experience was confused with portfolio Lambdas. | Dedicated database and AWS context covers SQL Server, PostgreSQL on RDS and PostgreSQL-compatible Aurora, DynamoDB, SQS, Lambda and CDK. Exclusively professional questions retrieve profile facts without editorial posts or architecture. |
| The entire stack could be attributed to Comafi or a particular project. | Confirmed Comafi work uses Angular, NestJS, AWS microservices, CDK infrastructure, Lambda and PostgreSQL. Broad knowledge does not establish usage in every system. Named-project questions exclude unrelated personal skills. |
| First-person FAQ and distant generated responses differed; job questions received suggestions about «that project». | Consistent first-person profile voice, Argentine voseo, direct answers normally in 2–4 sentences, and suggestions grounded in retrieved professional context. |
| A missing retrieved fact could become «the portfolio does not specify». | Prompt and fallback state lack of confirmation without asserting global absence. Operational errors remain distinct from missing knowledge. |
| Languages and preferences were available only through exact FAQ matches. | Existing texts are shared with professional context. Preferences do not authorize promises of immediate availability. |
| Cloud context omitted one Lambda and the subscriptions facade. | Add `publish-chat-knowledge`, verified in `portfolio-cloud/template.yaml`, and describe the API HTTP facade. The Lambda title explicitly identifies the portfolio. |

AWS CDK is infrastructure as code, not a microservice runtime. No internal email, payment details or private meetings were published. Existing facts about Ingertec, MySQL, MongoDB, languages and preferences remain; no responsibilities, metrics or certifications were invented. «Around four years» remains approximate and needs review when the profile changes.

## Reference employment answer

> Trabajo en Banco Comafi a través de Boreal IT, la consultora que me emplea. Mi día a día está dentro del equipo de Comafi, en el área de Fondos Comunes de Inversión.

Technical detail expands when relevant. The employment FAQ also preserves a canonical answer when provider rephrasing fails.

## Evidence and validation

- Baseline: 75 unit tests and 26 integration tests passed. Ten new regressions failed before selection and data corrections.
- Final validation: API and frontend lint/build; 107 API unit tests, 31 API integration tests and 91 frontend tests passed. `git diff --check` passed.
- Regressions cover accented/unaccented employment questions, Comafi/Boreal, database and AWS questions, «what do you do there?» with history, languages/contact, Foodly stack isolation and employment suggestions.
- HTTP integration inspects context sent to the provider and employment fallback during provider failure. Provider responses are mocked; these tests do not establish linguistic quality of real generations.
- Additional offline inspection used `portfolio/.generated/chat/knowledge.json`: three projects and eleven posts. Employment, database, AWS, Foodly isolation and portfolio architecture selection were checked.
- Real `gpt-4.1-mini` evaluation: eight initial synthetic cases and two three-case rechecks, fourteen provider calls total, all HTTP 200. The previous audit budget remains untouched. This evaluation has its own persistent ledger and refuses automatic resets.
- Cases cover employment, job follow-up, databases, SQS/Lambda/CDK, false employment premise with incorrect history, project comparison, second-project isolation and unconfirmed Redis knowledge. Automated checks passed, but manual review found an ambiguous affirmative and an overstatement about all infrastructure being managed through CDK. Rules were refined and verified facts moved into the system message, separated from visitor input. The final check removed the ambiguity and overstatement; an awkward Redis phrase («No tengo confirmado que tenga…») remains while correctly expressing uncertainty.
- Total usage: 22,135 input tokens and 1,445 output tokens. Provider latency: 1,254–3,273 ms, mean 1,908 ms. Small sample, no monetary estimate or production extrapolation. The three affected cases were repeated, not the entire matrix against the latest prompt.
- Script: `scripts/evaluate-assistant-profile.cjs`; results, usage, prompt hashes and budgets in Git-ignored `.generated/assistant-profile-evaluation/`. These are synthetic evaluation conversations, not visitor records. Review follows [official evaluation guidance](https://developers.openai.com/api/docs/guides/evaluation-best-practices); role separation follows [text generation documentation](https://developers.openai.com/api/docs/guides/text).

## History and availability

HTTP contract, provider, model, cache TTL, timeouts and editorial storage remain in place. Known exclusively professional questions (employment, introduction, stack, databases, AWS, languages, contact and commercial inquiries) bypass editorial loading entirely. R2 failure no longer blocks those local facts. Project, post and mixed editorial questions retain 503 when no valid source exists, rather than falling back to invented project facts.

The widget sends up to six previous turns in `history`, in order, excluding the current question, greeting and fallback messages. Each content is limited to 1500 UTF-16 units without splitting surrogate pairs; total JSON stays within 15 KiB to respect API's 16 KiB limit, dropping oldest turns first. SessionId is capped at 100 characters. Restored localStorage messages follow the same bounds. No persistent conversation memory is added to API; existing browser storage remains.

## Metrics and privacy

`ChatMetrics` emits JSON through the existing logger without new dependencies or a metrics server:

| Event | Values and purpose |
| --- | --- |
| `chat_reply` | `faq`, `ai`, `fallback`, `out_of_scope`, `error`; total duration. Count responses, fallbacks and failures without treating domain rejection as provider failure. |
| `chat_knowledge` | `curated`, `editorial`, `error`; selection duration. |
| `chat_provider` | `success`, `cache_hit`, `disabled`, `empty_context`, `http_error`, `invalid_response`, `timeout`, `network_error`; duration and token usage when reported. |

Existing logs can aggregate results, calculate percentiles over `durationMs`, count `cache_hit` and sum `inputTokens`, `outputTokens` and `cachedInputTokens`. Local cache hits do not count tokens again; provider-cached tokens are a subset of input tokens. Missing usage remains absent, not zero. These measure operations, not answer correctness.

Events use allowed fields only: no question, answer, history, sessionId, identity or credentials. Provider errors no longer print arbitrary exception text. In-memory cache keys are SHA-256 digests rather than plaintext questions/history; cached answers retain the existing 24-hour TTL. Widget analytics records suggestion length instead of text. Retention and visualization belong to the existing logging system; this task deploys no dashboards and does not change external provider data policy.

## Planned publication

Review both diffs, deploy API first and frontend second. API already supports optional history, but this order avoids incompatibility with older installations. Professional local facts do not require editorial artifact republication. A fresh API instance loads profile/prompt with an empty cache. After deployment, check employment, «there» follow-up, project comparison and «second», and text-free metric events. Deployment and public smoke were not performed.
