# Organization Team Site

A simple static website that lets you enter a GitHub organization name and displays:
- Founder/Owners (org owners)
- Team members (public members)

It also lets you add custom URLs/links and generates:
- a README.md-friendly Markdown snippet
- an embeddable HTML snippet

## Card service URL (important)
GitHub Pages is static, so **`/api/card.svg` will not exist** on your Pages domain.

To generate a dynamic SVG “card” (streak-card style), deploy the included Cloudflare Worker in `card-service/`, then set the **Card Service Base URL** in the UI.

You can also set it via URL:
- `?cardBase=https://your-worker.workers.dev`

## Local development
Open `index.html` in your browser.

## GitHub Pages
1. Go to **Settings → Pages**
2. Under **Build and deployment** select **Deploy from a branch**
3. Choose your default branch and folder `/ (root)`
4. Save

Then your site will be available at the Pages URL shown there.
