# Upload this complete package with GitHub Desktop

1. Download APEX-Build-3B-GitHub-Pages-VERIFIED.zip and choose Extract All in Windows. Open the extracted folder. It should immediately contain package.json, app, components, github-pages, and .github. There is no extra project folder inside.
2. Open GitHub Desktop, sign in, and select your existing apex-formula-lab-AI repository. If it is not listed, use File > Clone repository, select patrickPetscavage/apex-formula-lab-AI, and clone it first.
3. Click Fetch origin and Pull origin if offered. Select your main branch (or master if that is your default).
4. Choose Repository > Show in Explorer. This is the destination folder.
5. In the extracted package folder, enable View > Show > Hidden items. Select ALL contents (Ctrl+A), copy, and paste them into the destination repository folder. Choose Replace the files in the destination. This package does not include .git: keep your existing .git folder. Do not copy the enclosing ZIP/extraction folder as a nested subfolder.
6. Check that the destination has package.json, vite.pages.config.ts, github-pages/index.html, github-pages/main.tsx, github-pages/dynamic.tsx, tests/verify-pages.mjs, scripts/package-source.py, and .github/workflows/deploy-pages.yml. PACKAGE_MANIFEST.txt lists the full package.
7. On github.com open the repository Settings > Pages. Under Build and deployment, set Source to GitHub Actions.
8. In GitHub Desktop review Changes, enter the summary Upload complete verified Pages build, then Commit to main and Push origin. Do not upload only the ZIP or a selection of individual files.
9. On github.com open Actions > Deploy APEX to GitHub Pages. Wait for both build and deploy to have green checks. If no new run starts, use Run workflow on main/master.
10. Open https://patrickpetscavage.github.io/apex-formula-lab-AI/ and press Ctrl+Shift+R.

No conflicting custom workflow was found in the inspected repository; no file deletion is required. The earlier automatic pages build and deployment runs can remain in history.

If the deployment fails, open the NEWEST run for your latest commit and copy its first red-step error. Retrying an old run checks out the old incomplete commit.

The existing ChatGPT site is untouched. Browser setups/experiments do not transfer between origins: export from the old app and import into Pages.

Local check (Node 24, pnpm 11.25.0):
    pnpm install --frozen-lockfile
    python3 scripts/package-source.py
    pnpm build:pages
    pnpm test:pages
    pnpm preview:pages
Open the preview at /apex-formula-lab-AI/. Use these Pages commands; the separate historical Sites build still has its own hosting requirements.
