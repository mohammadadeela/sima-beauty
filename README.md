# Sima Beauty

Online makeup store: a customer storefront and an admin panel in one app.
English, cash on delivery, built to run on a VPS next to Lucerne Boutique.

## What is inside

**Storefront**

- Landing page with a real-time 3D lipstick (drag to spin, pick a shade and the whole banner repaints)
- "Find your shade" powder compact that opens and filters products by colour
- Mascara close-up banner that animates as you scroll
- Shop with filters (category, brand, shade colour, price, sale, new), search, sorting
- Product pages with shades, stock per shade, photos, reviews, related products, recently viewed
- Bag drawer, wishlist, guest checkout, order confirmation, order tracking
- Customer accounts with order history
- Help pages: delivery and exchange, questions, contact, about, privacy, terms

**Built-in selling tools** (each one can be switched on or off in the admin panel)

- Free-delivery progress bar in the bag
- "Buy any 3, save 10%" bundle discount
- Free gift above an order amount
- Deal of the day with a countdown
- First-visit welcome pop-up that collects a WhatsApp number or email and gives a code
- Discount codes (percent or fixed, minimum order, usage limit, expiry)
- Low-stock notice, "goes well with your bag" suggestions, WhatsApp button

**Admin panel** at `/admin`

| Page | What you do there |
| --- | --- |
| Dashboard | Sales today / 7 days / 30 days, things waiting for you, best sellers, low stock |
| Orders | See every order, change its status, WhatsApp or call the customer, print |
| Products | Add and edit products, photos, shades and stock; quick on/off switches |
| Categories and brands | The menu, home page tiles and filters |
| Offers and codes | All selling tools and discount codes |
| Customers and reviews | Approve reviews, read messages, customers, subscribers |
| Home page | Top bar, headline, lipstick shades, banners |
| Store settings | Delivery areas and prices, contact details, policies, questions |

## Project structure

```text
sima-beauty/
├── client/                 Browser app (React + Vite + Tailwind)
│   ├── index.html
│   └── src/
│       ├── App.tsx             Routes
│       ├── components/
│       │   ├── brand/          Logo and product illustrations
│       │   ├── three/          The 3D lipstick (plain WebGL)
│       │   ├── home/           Compact and mascara showcase
│       │   ├── layout/         Navbar, footer, bag drawer, welcome offer
│       │   ├── product/        Product card, grid, rail
│       │   └── ui/             Small shared pieces (drawer, modal, toast…)
│       ├── lib/                API helper, data hooks, bag/wishlist state, formatting
│       ├── pages/store/        Customer pages
│       ├── pages/admin/        Admin pages
│       └── styles/index.css    Global styles and animations
├── server/                 API (Express + PostgreSQL)
│   ├── index.ts                App start, security, static files
│   ├── db.ts                   Database connection and tables (created automatically)
│   ├── auth.ts                 Sessions, passwords, admin check
│   ├── settings.ts             Default store content
│   ├── catalog.ts              Product queries
│   ├── pricing.ts              The one place totals are calculated
│   ├── seed.ts                 Sample catalogue
│   └── routes/                 store.ts, account.ts, admin.ts
├── shared/types.ts         Types used by both sides
├── deploy/                 deploy.sh, PM2 file, nginx site
└── uploads/                Product photos uploaded from the admin panel
```

All colours live in `tailwind.config.ts`. Change a value there and the whole store follows.

## Run it on your computer

Needs Node.js 20+ and PostgreSQL.

```bash
npm install
cp .env.example .env        # then edit .env
npm run dev                 # http://localhost:5001
```

The tables are created automatically the first time the app starts.

## Put it on the Hostinger VPS

These steps assume the VPS already runs Lucerne (Node, PM2, nginx and PostgreSQL are installed).
Sima runs as a second app on port **5001** with its own database, so the two stores never touch each other.

### One-command IP-based demo deployment (no domain required)

On your **Hostinger Ubuntu VPS** terminal (root/sudo access), paste:

```bash
curl -fsSL https://raw.githubusercontent.com/mohammadadeela/sima-beauty/main/deploy/install-vps.sh | sudo bash
```

**Shared-server safe mode:** This installer does **not** run `apt`, install/enable/restart PostgreSQL or Nginx, change firewalls, add a port-80 site, modify PM2, or change the system Node version. It checks that all prerequisites are already installed and that port **5001** is free; if not, it safely stops rather than interfering with existing sites. It creates only Sima-owned resources (app directory, isolated Node 22 runtime, system user/service, one PostgreSQL role and one empty database). It does use CPU/RAM/disk and a listening port, so zero impact on shared server resources cannot be guaranteed.

**URL:** `http://YOUR_VPS_IP:5001` and admin `http://YOUR_VPS_IP:5001/admin`. The script prints the real URLs and a random admin password, also saved in `/root/sima-beauty-login.txt` (`sudo cat /root/sima-beauty-login.txt`). If Hostinger's firewall blocks TCP 5001, open that port in hPanel yourself. The installer does **not** alter any firewall rules. This is plain HTTP for dummy testing; never enter real customer details or use real payments until you have a domain and HTTPS. Run the same command again to update **only** the managed Sima installation. If any resource already exists without Sima's management marker, the script refuses to replace or take it over.

**Note:** An existing PostgreSQL server, Git, curl, tar, openssl and the other prerequisites must already be available. The script refuses to install system packages because package upgrades can affect other websites. For a new, empty VPS, prerequisite installation is a separate administrative decision.

### 1. Upload the code

Easiest is a GitHub repo, the same way as Lucerne:

```bash
# on your computer, inside the sima-beauty folder
git init && git add . && git commit -m "Sima Beauty"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/sima-beauty.git
git push -u origin main

# on the VPS
cd /var/www
git clone https://github.com/YOUR_USERNAME/sima-beauty.git
cd sima-beauty
```

(Or upload the zip with FileZilla and unzip it in `/var/www/sima-beauty`.)

### 2. Create the database

```bash
sudo -u postgres psql
```

```sql
CREATE USER sima WITH PASSWORD 'choose-a-strong-password';
CREATE DATABASE sima OWNER sima;
\q
```

### 3. Create the `.env` file

```bash
cp .env.example .env
nano .env
```

Fill in:

- `DATABASE_URL` with the password from step 2
- `SESSION_SECRET` with the output of `openssl rand -hex 32`
- `SITE_URL` with your real address, for example `https://www.simabeauty.com`
- `ADMIN_EMAIL` and `ADMIN_PASSWORD`: your admin sign-in (8+ characters)
- `SEED_DEMO=true` if you want the sample products on the first start

### 4. Install, build, start

```bash
npm ci --include=dev
npm run build
pm2 start deploy/ecosystem.config.cjs
pm2 save
curl http://127.0.0.1:5001/api/health      # should print {"ok":true}
```

### 5. Connect the domain

Point the domain's A record to the VPS IP in Hostinger DNS, then:

```bash
sudo cp deploy/nginx.conf /etc/nginx/sites-available/sima
sudo nano /etc/nginx/sites-available/sima      # put your real domain in
sudo ln -s /etc/nginx/sites-available/sima /etc/nginx/sites-enabled/sima
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

HTTPS is required: sign-in cookies are only sent over a secure connection.

### 6. First sign-in

Open `https://your-domain.com/admin` and sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

Then:

1. **Store settings**: add your WhatsApp number, phone and address.
2. **Products**: replace the sample products with yours and upload real photos.
3. Set `SEED_DEMO=false` in `.env` so samples are never added again.

### Updating later

```bash
cd /var/www/sima-beauty
npm run deploy
```

It pulls the latest code, installs, builds while the old version keeps serving, restarts, and checks the site is healthy.

### Backups

Two things hold your data:

```bash
pg_dump -U sima -h 127.0.0.1 sima > sima-backup.sql     # orders, products, settings
tar czf sima-uploads.tgz uploads                        # product photos
```

## Good to know

- **Sample catalogue and demo database.** 36 fictional products across eight categories, 30 fake orders, 8 test customers, 18 sample reviews, three coupon codes, and fictional subscriber/messages. Prices and stock are placeholders. Replace everything before going live.
- **Product illustrations.** A product without a photo shows a drawn illustration tinted with its shade colour. Upload a photo and it takes over.
- **Payment.** Cash on delivery only. A card gateway can be added later in `server/routes/store.ts`.
- **Fonts** load from Google Fonts (Bodoni Moda, Figtree, and Tajawal for Arabic).
- **Language.** The whole store and the admin panel are in English. Arabic typed into the admin panel (product names, policies) still displays correctly.
- **3D.** The hero lipstick, the powder compact and the mascara are live 3D (`client/src/components/three`). The product pictures used when a product has no photo are renders of the same 3D models, stored in `client/public/art`. To change them, edit `models.ts`, run `npm run dev`, then `node script/render-art.mjs` on a computer with Chrome and Playwright.
- **Prices are always calculated on the server** (`server/pricing.ts`), so a customer can never be charged a different total from the one shown.

## Getting found on Google (SEO)

The site already does the technical part: every product, category and brand page has its own title,
description, canonical address, share picture and structured data (price, stock, rating), plus
`/sitemap.xml` and `/robots.txt`. No one can promise first place on Google, but these steps are what
move a new store up, in order of impact:

1. **Search Console.** Open https://search.google.com/search-console, add your domain, choose "HTML tag",
   and paste the code into Admin → Store settings → Google Search Console code. Then submit
   `https://your-domain.com/sitemap.xml` under Sitemaps.
2. **Google Business Profile.** Create a profile for the shop (name, city, phone, photos, website).
   This is what puts the store on the map and at the top for searches like "makeup near me".
3. **Real content.** Upload real product photos and write two or three honest lines for each product
   using the words customers search for (matte lipstick, waterproof mascara…). Pages with real
   photos and text rank; empty ones don't.
4. **Title and search words.** Set them in Admin → Store settings. Put your city in the title if you
   mainly sell locally, for example "Original makeup in Ramallah".
5. **Links.** Put the website link in the Instagram and Facebook bios, and ask customers for reviews
   on the product pages and on Google.

Expect new pages to appear within days and positions to improve over weeks, not hours.
