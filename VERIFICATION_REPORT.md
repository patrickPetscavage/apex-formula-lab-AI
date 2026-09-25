# APEX GitHub Pages package verification — 25 September 2026

## Source and remote audit

Source commit: 9615c812cc157b3cac0822ce05387bce7372f296 (github-pages-support), based on published Build 3B commit 91a5111d6b0c30508af7c96a2f28b156a32a29ee.

GitHub inspected via public API: patrickPetscavage/apex-formula-lab-AI, main at 8a6fd35745ae342ccb222d57fc0ef8ebf8949c18. Latest inspected run 36138811046 failed at `Run pnpm build:pages`; deploy was skipped. No new GitHub deployment was performed or claimed.

At inspection, GitHub was missing .gitignore, .npmrc, GITHUB_PAGES.md, github-pages/dynamic.tsx, github-pages/index.html, github-pages/main.tsx, public/apex-formula-lab-source.zip, and tests/verify-pages.mjs. README.md and scripts/package-source.py differed from the audited local source. package.json and vite.pages.config.ts now matched. Only .github/workflows/deploy-pages.yml was present as a custom workflow; no conflicting workflow deletion is required.

The previous source ZIP DID contain the required Pages files. Therefore the observed missing-file failures are consistent with an incomplete/outdated upload; the available evidence does not identify exactly which Windows upload step omitted files.

## Packaging correction

The new ZIP places all repository files directly at its root and includes hidden files. It adds complete Windows/GitHub Desktop upload directions and a path manifest. The source-download helper now uses the same flat structure and skips excluded directories before traversing them. The application, vehicle models, geometry, styles, lockfile and dependency versions are unchanged.

## Checks performed

- Extracted package outside original project into a clean directory, with no node_modules or private Sites configuration.
- Node 24.19.0 and pnpm 11.25.0. Frozen-lockfile installation downloaded and installed 636 packages into the clean extraction; no original project node_modules/store was used.
- Ran the workflow's source-packaging, build:pages and test:pages commands with PAGES_BASE_PATH=/apex-formula-lab-AI/.
- Static index.html, CSS, application scripts, lazy Viewport module and lap worker emitted successfully.
- Repository-prefixed entry assets, worker and source/data download links verified against actual output files; no file:// machine URLs in bundles.
- Executed the BUILT worker: F2004 centerline 108.59340246833438 seconds; SF-26 centerline 126.71084397032935 seconds. Regression expectations unchanged.
- Existing targeted vehicle identity/catalog, saved experiment, motion and SF-26 numerical tests passed in the independent extraction.
- Final delivery archive extracted again into a new clean directory, with a separate node_modules installation. A dependency download cache from the first clean test may be reused; no dependencies from the original project are referenced. Workflow build/tests repeated for final bytes.
- Archive CRC and path manifest verified; no .git, node_modules, .openai, .env files or local caches included.

## Limits

WebGL visual appearance was not retested, per the known Work-browser limitation. No GitHub authentication or deployment approval settings were exercised locally; publication still requires uploading these files, selecting GitHub Actions in Pages settings and a successful remote workflow. Large-bundle warnings are nonfatal. The original Sites build remains separate; use build:pages for the standalone package.

Browser-local saved results belong to each origin and need JSON export/import to move to GitHub Pages. Keep all included third-party licenses and track notices.
