# Publish APEX Build 3B on GitHub Pages

This build reuses the existing React application, car geometry and lap worker. It adds a separate Vite static entry; the Sites deployment is not changed. No private Sites manifest, API keys or server are needed for the Pages build.

## Update the existing repository

1. Extract the source ZIP. Copy the CONTENTS of its `apex-formula-lab` folder into your existing GitHub Desktop repository folder. Replace matching files. Include `.github/workflows/deploy-pages.yml` (enable hidden files if necessary). Keep your repository's `.git` folder.
2. On GitHub open **Settings → Pages → Build and deployment → Source**, choose **GitHub Actions**.
3. In GitHub Desktop commit the changes with summary `Enable GitHub Pages app` and click **Push origin**.
4. Open the repository's **Actions** tab. Wait for **Deploy APEX to GitHub Pages** to finish successfully. If needed select that workflow, click **Run workflow**, choose your main/master branch, and run it.
5. Visit https://patrickpetscavage.github.io/apex-formula-lab-AI/ and hard-refresh with Ctrl+Shift+R.

The workflow builds and deploys automatically on future main/master pushes. It derives the correct repository base path from GitHub Pages. Do not upload only the ZIP, enable Jekyll, or select a README folder as the publishing source. Uploading the ZIP does not extract its files.

## Run locally

Use Node 24 and pnpm 11.25.0 (package.json pins the version).

```
pnpm install --frozen-lockfile
pnpm build:pages
pnpm test:pages
pnpm preview:pages
```

Open the preview URL with `/apex-formula-lab-AI/` appended. For a different local base, set `PAGES_BASE_PATH` to a path with leading/trailing slashes for both the build and test commands. The output is `dist-pages/`; it is generated, not committed.

## What was checked

Production static build, repository-relative HTML assets/download links/worker URL, and execution of the packaged simulation worker with unchanged F2004 and SF-26 regression laps. Source physics and geometry remain unchanged. WebGL appearance still needs inspection in your normal browser.

Browser storage is origin-specific: export setups/experiments from the existing Sites app and import them on GitHub Pages. They do not transfer automatically. Keep third-party notices and Suzuka data licenses included in this repository.

The original README below predates several milestones; BUILD_3B.md is the current model/feature summary. Original Sites build commands remain separate from `build:pages`.
