When generating commit messages, follow these rules:

- Do NOT use imperative verb form (e.g., "fix", "add", "update", "arreglar", "agregar").
- Use descriptive nominal style instead.

The message must describe the change as a completed state, not as an action command.

Examples:

❌ Wrong:
- arreglar bug en login
- agregar endpoint users
- refactorizar auth service

✅ Correct:
- corrección de bug en login
- agregado de endpoint users
- refactor del auth service

Additional rules:

- Write commit messages in Spanish.
- Use semantic commit format with scope: type(scope): description
- Types allowed: feat, fix, refactor, test, chore, docs
- Keep messages concise and professional.

## Pull Requests (PR)

When generating PR titles and bodies, follow these rules:

- Write PR title and body in Spanish.
- Use semantic PR title format with scope: `type(scope): description`
- Keep the PR title concise and professional.
- Use descriptive nominal style in the PR title (not imperative).
- The PR body must describe the resulting changes clearly and semantically.
- Do not include validation/test commands unless explicitly requested.
- Do not include commit hashes unless explicitly requested.

### PR body structure (recommended)

- Short summary paragraph (what changed and why).
- `## Cambios incluidos`
- Flat bullet list with the main changes.

### PR creation with GitHub CLI

- Prefer `gh pr create` when the user asks to "generate/create the PR".
- Use `--title` and `--body-file` (or `--body`) with the approved text.
- If PowerShell escaping can break markdown/backticks, prefer a temporary body file.
