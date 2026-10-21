# AGENTS.md — SaleKit API Learning Project

## 1. Interaction rules

- The user may write in English or Myanmar, but always respond in Myanmar language.
- Never create, update, remove, rename, move, fix, or otherwise modify code, files, folders, configuration, dependencies, the database, or project structure unless the user explicitly says the exact phrase:

  `Build Now`

- Similar phrases such as `start`, `next`, `continue`, `go ahead`, `do it`, or `proceed` are not permission to modify the project.
- Before `Build Now`, only inspect, discuss, explain, review, plan, suggest, and provide commands or focused code snippets for the user to write manually.
- When `Build Now` is given, make only the changes already discussed or explicitly requested in that message.
- Do not silently install packages, create database objects, run migrations, seed data, or modify the SaleKit frontend.

## 2. Project purpose

SaleKit API is a simple backend learning project for the existing SaleKit React frontend. The goal is to learn and manually reproduce useful Express, TypeScript, MySQL, API, and authentication fundamentals.

This is not intended to be an enterprise architecture or production-ready POS backend. Prefer code that a junior developer can understand, explain, and rewrite manually.

The main rule is:

> Help the user become capable of building the API without AI. Choose the simplest correct and valuable solution over an impressive or overly abstract solution.

## 3. Agreed technology

- Node.js
- Express
- TypeScript
- MySQL
- `mysql2` using the promise API
- `cors`
- `dotenv`
- `tsx` for development

Add TypeScript type packages only when required. Do not add an ORM, framework, or validation library unless the user explicitly requests one.

Authentication will be added only after product CRUD works and the React frontend is connected successfully.

## 4. Development order

Use this broad order without building an entire phase at once:

1. Initialize the Express + TypeScript project.
2. Run a minimal Express server.
3. Add environment-variable configuration.
4. Connect to MySQL and verify the connection.
5. Create the `products` table and preserve the SaleKit product data shape.
6. Build product CRUD one small logical part at a time.
7. Test CRUD independently with an API client.
8. Connect the SaleKit React frontend to the API incrementally.
9. Add sale and checkout persistence when agreed.
10. Add authentication only after the earlier flows are working.

Do not start authentication, sales, deployment, or advanced architecture early.

## 5. Required working style

The project must be built through tiny, logically connected code steps.

- Do not build feature by feature in large batches.
- Do not complete an entire file at once merely because the file exists.
- Do not generate the complete backend in one response.
- Teach one small concept or code flow at a time.
- The user normally writes the important code manually.
- AI help should focus on guidance, review, repetitive code, configuration details, and fixes explicitly requested by the user.

For every manual step:

1. State the small goal.
2. Name the exact file and location where the code belongs.
3. Provide only the focused snippet needed for that step.
4. Briefly explain what it does and why it is needed.
5. Explain how to verify it before moving on.
6. Wait for the user to say `done` or ask a question.

When the user says `done`, continue with the next smallest useful logical step. Inspect the actual current code before diagnosing an error.

## 6. Simplicity and code style

- Prefer ordinary functions, direct control flow, and readable variable names.
- Use simple TypeScript types and interfaces.
- Avoid advanced generics, decorators, classes, dependency injection, and unnecessary assertions.
- Avoid `any`; fix types properly.
- Keep related logic close together until real repetition justifies extraction.
- Do not create controller, service, repository, middleware, utility, or model layers merely to imitate enterprise architecture.
- Split code only when a file has a clear second responsibility or becomes difficult to follow.
- Avoid clever one-liners and excessive helper functions.
- Add short comments only where the reason is not obvious.
- Preserve existing working code and avoid unrelated refactors.

## 7. MySQL and data rules

- Use `mysql2/promise` for database access.
- Store database credentials in environment variables and never hard-code or commit secrets.
- Provide an `.env.example` without real credentials when environment setup is implemented.
- Always use parameterized SQL queries. Never concatenate user input into SQL strings.
- Validate request data before executing insert or update queries.
- Reject empty product names and categories, negative prices, and negative stock.
- Return useful HTTP status codes and small, consistent JSON responses.
- Handle missing records clearly, normally with `404`.
- Handle invalid input clearly, normally with `400`.
- Do not hide database or TypeScript errors with `any` or unsafe assertions.
- Do not create, drop, truncate, or seed a database unless the user has explicitly authorized that exact action with `Build Now`.

## 8. Preserve the SaleKit mock data

The existing SaleKit frontend mock data must not be forgotten or casually discarded.

Before designing database tables or API response types, inspect these frontend references:

- `D:\User\salekit\src\types\index.ts`
- `D:\User\salekit\src\data\initialProducts.ts`
- `D:\User\salekit\src\data\initialSales.ts`

Use the frontend product mock data as the basis for MySQL seed data when seeding is explicitly requested. Preserve the meaning of the current `Product`, `CartItem`, and `Sale` shapes when backend equivalents are introduced.

Do not delete the frontend mock data immediately after API integration. Keep it until the corresponding API flow has been tested and the user explicitly agrees to remove or replace it.

Expected core shapes currently include:

```ts
type Product = {
  id: string
  name: string
  price: number
  category: string
  stock: number
}

type CartItem = Product & {
  quantity: number
}

type Sale = {
  id: string
  items: CartItem[]
  total: number
  cashReceived: number
  change: number
  date: string
}
```

Database IDs may use a different representation only after explaining the tradeoff and agreeing on the frontend/API mapping.

## 9. Initial API scope

Start with product CRUD:

```text
GET    /api/products
GET    /api/products/:productId
POST   /api/products
PUT    /api/products/:productId
DELETE /api/products/:productId
```

Build these endpoints one small behavior at a time. Do not implement every route together.

Do not create a special dashboard endpoint initially. The React frontend can derive product counts, low-stock counts, sales counts, and revenue using array operations after fetching products and sales.

Sales endpoints and authentication routes are future scope and must be discussed before implementation.

## 10. Frontend integration rules

- The frontend is located at `D:\User\salekit`.
- The backend is located at `D:\User\salekit-api`.
- Keep them as separate sibling projects.
- Configure CORS only for the agreed frontend development origin.
- Connect one frontend data flow at a time after the API has been tested independently.
- Add loading, error, and empty states using simple React patterns.
- Do not modify the frontend unless the user explicitly authorizes the frontend change with `Build Now`.

## 11. Authentication scope for later

Authentication is intentionally postponed. When the user is ready, first discuss the simplest suitable flow, password hashing, token or cookie handling, protected routes, environment secrets, and frontend login state.

Do not add authentication packages or user tables before that discussion and explicit authorization.

## 12. After making authorized changes

After every `Build Now` change:

1. Summarize exactly what changed and where.
2. Explain the request flow, data flow, and important functions in plain Myanmar language.
3. Provide a short manual test procedure.
4. Give one small exercise for the user to attempt without AI.
5. Run appropriate available checks and report the real result.
6. Never claim that TypeScript, the server, MySQL, or an endpoint works unless it was actually checked.

If a check fails because of unrelated unfinished code, report the exact failure and do not expand the scope without permission.

## 13. Definition of done for a small step

A step is done when:

- The focused behavior works as described.
- The code is simple enough for the user to explain and reproduce.
- Types and common invalid inputs are handled correctly for that step.
- SQL is parameterized where user data is involved.
- The user knows how to test the behavior manually.
- No unrelated features or abstractions were added.
