# Sima Beauty

Online makeup store: a customer storefront and an admin panel in one app.
English only, cash on delivery, built to run on a VPS next to Lucerne Boutique.

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
- `SEED_DEMO=true` to create the complete **fictional test database** on a **new, empty database** (36 products across 8 categories, 8 brands, 8 customers, 30 orders, 18 reviews, 5 subscribers, 4 messages, and 3 coupons). Nothing real is contacted.

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
3. Set `SEED_DEMO=false` in `.env` after seeding. **This stops future seeding but does not delete any test data.** For launch, use a separate, clean production database; never mix demo orders with real customers.

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

- **Fictional demo database.** Set `SEED_DEMO=true` in `.env` for the first start against an empty PostgreSQL database. Seeded products, customers, order history, statuses, discounts, ratings, subscribers and messages help test the store and admin dashboard. Demo customer email addresses use the reserved `.invalid` suffix and all passwords are disabled. Orders start `SB-DEMO-` and are marked as test orders. Nothing is actually paid for or shipped. The seed only runs if there are no products. **Do not enable or reuse these data in a live store.**
- **Product illustrations.** A product without a photo shows a drawn illustration tinted with its shade colour. Upload a photo and it takes over.
- **Payment.** Cash on delivery only. A card gateway can be added later in `server/routes/store.ts`.
- **Fonts** load from Google Fonts (Bodoni Moda and Figtree).
- **Prices are always calculated on the server** (`server/pricing.ts`), so a customer can never be charged a different total from the one shown.
