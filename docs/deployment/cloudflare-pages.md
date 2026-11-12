# Cloudflare Pages deployment

SAFER is a React + Vite single-page application. Its current hosting build is static: \`npm run build\` emits \`dist/\`. It does not currently require a Vercel Function or a server-side rendering runtime for the application shell.

## Cloudflare Pages project settings

- Connect the existing GitHub repository: \`ErTapanJatakia/SAFER\`.
- Production branch: \`main\`.
- Framework preset: React (Vite), or configure manually.
- Build command: \`npm run build\`.
- Build output directory: \`dist\`.
- Root directory: repository root.
- Node.js: use Node 22, matching the repository validation workflow.

The \`public/_headers\` file is copied by Vite into \`dist/_headers\` and applies the existing browser security-header policy to Pages static responses. Keep it aligned with \`vercel.json\` while both hosting targets are supported. The Pages policy explicitly removes Cloudflare Pages' default wildcard \`Access-Control-Allow-Origin: *\` response header because SAFER's static application assets do not require cross-origin access.

Cloudflare Pages \`_headers\` rules apply to static asset responses. If SAFER later adds Pages Functions or Worker-generated responses, those handlers must set their own security headers; this file does not protect function-generated responses.

## Build and preview controls

To avoid consuming build quota on every feature branch or pull request:

1. Set the production branch to \`main\`.
2. Set Preview branch deployments to **None**.
3. Keep automatic production deployments enabled only for \`main\`.

Cloudflare Pages supports disabling preview branch deployments independently from production branch deployments. This matches the repository's existing main-only deployment preference.

## Build-time Firebase configuration

If the Firebase-backed sign-in path is enabled in the Cloudflare build, configure these existing public web-client variables in the Pages production environment:

- \`VITE_FIREBASE_API_KEY\`
- \`VITE_FIREBASE_AUTH_DOMAIN\`
- \`VITE_FIREBASE_PROJECT_ID\`
- \`VITE_FIREBASE_APP_ID\`

These are Firebase web client configuration values, not service-account credentials. Do not add Firebase Admin credentials, service-account JSON, or private keys to Pages build variables.

After the first Pages hostname is known, add that exact hostname to Firebase Authentication's authorised domains if Firebase sign-in is intended to be tested there. Do not provision tenants, change Firestore rules, or upload real personnel or incident records as part of hosting migration.

## Safe migration sequence

1. Create the Pages project without changing the existing Vercel project or its domain.
2. Deploy \`main\` to the Pages-provided \`*.pages.dev\` hostname.
3. Confirm the deployment commit matches the intended GitHub \`main\` SHA.
4. Verify the security headers on both \`/\` and a static asset. Confirm there is no wildcard \`Access-Control-Allow-Origin\` header.
5. Exercise the demonstration notice, Demo Guest workspace, navigation, accessibility controls, personnel workflows, incident documentation, Cyber Hygiene, readiness checklist, and all export formats.
6. If Firebase sign-in is tested, verify authorised-domain configuration and confirm the existing Firestore deny-by-default posture remains unchanged.
7. Only after all checks pass, decide whether to move a custom domain. Keep Vercel available as rollback until Cloudflare has been stable.

## Operational notes

- Use Cloudflare Pages Git integration, not Direct Upload, so GitHub remains the source of truth. Cloudflare documents that a Git-integrated Pages project cannot later be converted to Direct Upload.
- The first Pages project creation and GitHub authorisation must be completed by an account owner in the Cloudflare dashboard.
- No Cloudflare API token is required for the dashboard Git integration.
- This repository change prepares compatibility; it does not create a Cloudflare account, connect GitHub to Cloudflare, create the Pages project, or perform a production deployment.
