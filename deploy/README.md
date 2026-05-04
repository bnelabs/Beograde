# Deploying Beograde to Hetzner

A small Hetzner CX11 (or similar) handles this fine — the app is static
plus a one-shot ~70 MB tile download per visitor.

## Prereqs on the VPS

```bash
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx
```

Point your DNS A/AAAA records at the box, then:

```bash
sudo certbot --nginx -d beograde.example.com
```

## Install the site config

```bash
sudo cp deploy/nginx.conf /etc/nginx/sites-available/beograde
# edit server_name and ssl paths inside the file to match your domain
sudo ln -sf /etc/nginx/sites-available/beograde /etc/nginx/sites-enabled/beograde
sudo nginx -t && sudo systemctl reload nginx
```

## Build locally and ship

```bash
# 1. Build the offline tile pack ONCE on your laptop (see scripts/README.md)
PLANETILER_JAR=~/Downloads/planetiler.jar npm run build:tiles
npm run build:fonts
npm run build:itineraries        # optional, upgrades placeholder routes

# 2. Build the Angular app
npm ci
npm run build

# 3. Sync to the VPS
rsync -avz --delete \
  dist/app/browser/ \
  beograde@your-vps:/var/www/beograde/
```

Make sure the tile pack lands at `/var/www/beograde/assets/tiles/belgrade.pmtiles`
on the server. With the nginx config above it will be served with byte-range
support and cached for a month.

## Verifying the byte-range setup

```bash
curl -I -H 'Range: bytes=0-1023' https://beograde.example.com/assets/tiles/belgrade.pmtiles
# expect: HTTP/2 206  +  Content-Range: bytes 0-1023/<total>
```

If you don't see `206 Partial Content`, the PMTiles client will fall back to
downloading the whole file for every map gesture — slow and expensive.

## On-device testing

1. Open `https://beograde.example.com` in **Safari on iPhone** (must be HTTPS).
2. Tap **Share → Add to Home Screen**.
3. Launch from the home screen icon.
4. Hit **Download Belgrade pack** and wait for the progress bar.
5. Toggle airplane mode and confirm the map still pans/zooms.
