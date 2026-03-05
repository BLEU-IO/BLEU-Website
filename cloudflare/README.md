# Cloudflare Worker: Root Router

This worker handles only root requests:

- Browser request to `/` -> homepage HTML at root (no URL change)
- CLI request to `/` (`curl`, `wget`, etc.) -> plain text TUI
- Any other path -> pass-through to origin (GitHub Pages)

## Files

- `worker.js`: Worker logic
- `wrangler.toml.example`: starter Wrangler config

## Deploy

1. Put your domain behind Cloudflare DNS/proxy.
2. In `cloudflare/`, copy config:
   - `cp wrangler.toml.example wrangler.toml`
3. Deploy with Wrangler from that directory:
   - `npx wrangler deploy`
4. Confirm behavior:
   - `curl https://bleu-community.tech`
   - Open `https://bleu-community.tech` in a browser (should show website home at `/`).

## Notes

- Keep your website content deployed via GitHub Pages as before.
- Worker only changes runtime behavior at `/`.
