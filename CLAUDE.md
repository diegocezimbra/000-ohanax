# CLAUDE.md — Website & Dashboard (00)

## Central Knowledge Base
Shared knowledge across all Claude instances: `~/Documents/claude-knowledge/`
- `memory.md` — Persistent memory. **Update after every significant task.**
- `skills.md` — Reusable procedures | `projects.md` — Project registry

## Stack
- **Backend**: Express.js + Node.js
- **Database**: MongoDB + PostgreSQL
- **Frontend**: Static landing page + Dashboard
- **Deploy**: AWS AppRunner (backend)
- **Auth**: httpOnly cookie `security_access_token`, BFF pattern

## Conventions
- Follow patterns in `~/Documents/claude-knowledge/CLAUDE.md` (global directives)
- TypeScript strict mode
- Never hardcode data in frontend — all from API
