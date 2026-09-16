---
"@codesocietyou/contentedge-cms-sdk": major
---

Default list requests omit `sortBy` and `direction` so the CMS admin display order applies (`sortOrder` ASC). Callers that depended on implicit `id DESC` must pass `sortBy: "id"`. Content items now include optional `sortOrder`. Runtime dependency `axios` is updated to `^1.20.0`.
