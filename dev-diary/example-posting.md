# Worked example: source posting

Source material for the shipped fixture (T07). Working notes only. This file is
not the fixture and does not ship to the browser.

- **Role:** (IND) Manager, Technical Writing
- **Team:** Walmart Connect, Walmart Global Tech India
- **Location:** Bengaluru, Karnataka, India (Cessna Business Park, office-based)
- **Listing:** LinkedIn job 4419249824

## What the role owns

API documentation for the Walmart Developer Portal, covering the Sponsored
Search and Onsite Display product APIs.

## Stated responsibilities

- Develop, maintain and proofread API technical documentation for the developer portal.
- Collaborate with subject-matter experts to gather information and review technical specifications.
- Write clear, concise, user-friendly content that adheres to industry standards.
- Partner with Product Managers and Developers to document capabilities and new features.
- Manage documentation requests and meet project management SLAs.
- Organize and structure technical content for optimal user experience.

## Stated requirements

- Bachelor's degree in communications, journalism, business or related field.
- 6+ years in technical writing, engineering, product or a related technical field.
- Understanding of API basics and REST API concepts.
- Proficiency in HTML, XML and Markdown.
- Experience with Swagger/OpenAPI, GitHub and Jira.
- 2+ years working with cross-functional teams.
- Familiarity with version control systems.
- Experience with content management systems such as WordPress or Readme.
- Knowledge of software development processes and methodologies.

## Note on the stated minimum

The body asks for 6+ years, but the formal minimum qualifications say 2 years
with a relevant degree, or 4 years without one. That gap is worth a question,
because it tells a candidate where the real bar sits.

## Fixture policy

The fixture ships the brief, the eight questions and one short verbatim line
per question as its `sourceQuote`. It does not ship the full posting body.

---

## WebMCP API contract, verified 1 Sep 2026

Confirmed against Chrome 152 on the live origin, with no flag set. Several of
these differ from what the published examples show.

| Thing | Reality |
|---|---|
| `document.modelContext` | Present. `navigator.modelContext` is `undefined`, so document is the live form. |
| `getTools()` | Returns a **Promise**, resolving to an array. Not an array directly. |
| `executeTool(tool, args)` | Takes the **RegisteredTool object**, not a name string. |
| `args` | Must be a **JSON string**. Passing an object throws `Failed to parse input arguments`. |
| Returned `inputSchema` | Comes back as a JSON **string**, not an object. |
| Tool handle fields | `name`, `title`, `description`, `inputSchema`, `annotations`, `origin`, `window`. No `execute`. |
| `annotations` | `readOnlyHint` is auto-populated as `false` when omitted, which is the side-effect signal we want. |
| Prototype | `registerTool`, `getTools`, `executeTool`, `ontoolchange`. |
