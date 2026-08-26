# GitHub Pages deployment

The RoboPath export is ready for a GitHub Pages build. In the repository, open **Settings → Pages**, select **GitHub Actions** as the deployment source, then choose GitHub’s standard Vite workflow. The workflow will run `pnpm build` and publish `dist/public`.

The project uses the repository path `/robopath/` during GitHub Actions builds, and its generated image assets are included in `client/public/robopath-assets/`.

> Note: GitHub Pages availability for private repositories depends on the GitHub plan. If Pages is unavailable, the same static build can be deployed from this repository to another host, or you can publish through the built-in Manus hosting interface.

