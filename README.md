# Love.xxx Inspired Remake

Interactive home-grid remake inspired by the 2014 [love.xxx](http://love.xxx/) experience (Folder Studio): six full-bleed portals, hover image cycling, and zoom-into-portal.

**Not** a clone of the original CMS content or media. V1 is home grid only.

## Quick start

From PyCharm: run [`main.py`](main.py) (green gutter / ⌃R). It serves the site at `http://127.0.0.1:8080/` and opens a browser.

```bash
python main.py
# python main.py -p 9000 --no-browser
```

## Content model

All gallery pictures are **external absolute URLs**. The frontend never hosts your photos — it only reads them from [`content.json`](content.json).

```json
{
  "site": { "title": "<3", "name": "LOVE.XXX" },
  "portals": [
    {
      "id": "store",
      "label": "store",
      "color": "#008af6",
      "images": [
        "https://your-cdn.example/photo-1.jpg",
        "https://your-cdn.example/photo-2.jpg"
      ]
    }
  ]
}
```

### Image hosting workflow

1. Upload images somewhere that serves **public direct links** (Cloudflare R2 + custom domain, Bunny Storage, Cloudinary, Backblaze B2, etc.).
2. Copy each HTTPS URL into the matching portal’s `images` array in `content.json`.
3. Commit and push — GitHub Pages redeploys the static app only.

Do not commit large image binaries into this repo.

Seed URLs currently use [picsum.photos](https://picsum.photos) placeholders so the grid works out of the box. Replace them with your own.

## UI tests

Reference-behavior checks (Playwright) live in `tests/reference.spec.js`:

```bash
npm install
npx playwright install chromium
npm test
```

## Deploy (GitHub Pages)

The app sits at the repo root (`index.html`, `css/`, `js/`, `assets/`, `content.json`), so `https://<user>.github.io/<repo>/` is the site itself — no `/web/` path and no redirect.

- **Branch deploy (current):** Settings → Pages → Deploy from a branch → `/ (root)`.
- **Actions (optional):** Settings → Pages → Source: GitHub Actions. The workflow builds with Node.js 24 and publishes only the site files via [`.github/workflows/pages.yml`](.github/workflows/pages.yml).

Paths inside the app are relative (`./css/...`, `./content.json`).

## Interactions (v1)

| Input | Behavior |
|--------|----------|
| Hover (desktop) | Cycle images in that portal; shuffle after a full pass |
| Click | Zoom that portal to fullscreen; show placeholder detail + image strip |
| Back / Escape | Zoom out to the grid |
| Tap (mobile) | First tap cycles; second tap on the same tile zooms |

## Backlog (post-v1)

- Full portal experiences: store (clouds, product flip), videos, charms, commercials, contact
- Video playback
- Mobile double-tap / external link behaviors from the original
- Wayback recovery tooling for research only
- Custom domain / `.xxx`
- CMS or admin UI for uploads
- Auth, analytics, e-commerce
- Custom webfonts closer to the original display face
- Server-side API / Python backend

## Reference

Local browser save and unminified scripts under `~/Downloads/Projects/business/lovexxx <3*` were used only as interaction reference. Original design credit: Folder Studio (2014).
