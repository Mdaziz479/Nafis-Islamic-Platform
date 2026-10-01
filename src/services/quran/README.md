# Quran services

The server-only `QuranService` and `TranslationService` use the official `@quranjs/api/server` client. UI components receive normalized types from `src/types/quran.ts`; credentials, tokens, and provider calls remain server-side.

Set `QF_CLIENT_ID`, `QF_CLIENT_SECRET`, and `QF_ENV` in an ignored `.env.local`. `QF_ENV` must be `prelive` or `production`; both API and OAuth hosts are selected together. Do not use production credentials with pre-live or expose secrets through `NEXT_PUBLIC_*` variables.

Pre-live currently exposes only Surahs 1 and 2. The service returns only provider data and refuses incomplete Surahs; it does not fill missing content with local text.

Quran search uses the SDK's server-side Search API. Search requires a separate permission for the same Developer Console app and environment; until it is granted, `/search` shows the provider's unavailable state and never fabricates matches.
