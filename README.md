# Jungle. — Agency Website & Complete CMS

Combined, self-contained website and content management system for **Jungle.** Agency.

---

## ⚡ Quick Start (1 Command)

Open your terminal, navigate to the `Jungle` directory, and run:

```bash
cd Jungle
npm install
npm start
```

That's it! Everything is running on a single port:

- 🌐 **Agency Website:** [http://localhost:3000](http://localhost:3000)
- ⚙️ **CMS Admin Panel:** [http://localhost:3000/admin](http://localhost:3000/admin)

### 🔐 Admin Login Credentials
- **Username:** `admin`
- **Password:** `admin`

*(You can change the password anytime inside the CMS).*

---

## 🚀 Features

1. **Complete CMS Management**:
   - **Projects / Work**: Edit existing projects or add new ones (Number, Name, Slug, Tags, Thumbnail, Video, Quotes, Challenge, Approach, Results).
   - **Exclusive Work-Section Drawer**: Manage exclusive `workDescription` and `workDetails` specs list for each project. Clicking any work tile in the Work section expands an interactive drawer with project details, deliverables, timeline, and location specs right inside the Work section!
   - **Site Settings**: Header logo, footer marks, navigation links, office address, phone, email, copyright, and dark mode defaults.
   - **Homepage**: Hero headlines, year badges, rotating words, studio space text & images, W.I.L.D services, and clients list.
   - **About & Contact Pages**: Full control over paragraphs, story sections, short facts, and office contact information.

2. **Zero Setup Required**:
   - Built on Node.js and Express.
   - Serves the live site, admin CMS, API, and file uploads out of the box.
   - Automatic JSON data backups created in `backups/` whenever changes are saved.

---

## 📁 Project Structure

```
Jungle/
├── package.json         # Node.js dependencies (npm start)
├── server.js            # Express server (Web & CMS API)
├── admin/               # CMS Admin Panel SPA
│   └── index.html
├── public/              # Live Agency Website
│   ├── index.html       # Homepage (with Work Section interactive drawer)
│   ├── about.html       # About Page
│   ├── contact.html     # Contact Page
│   ├── project.html     # Case Study Page (?p=slug)
│   ├── data/            # Editable JSON content files
│   ├── uploads/         # Uploaded images & media
│   ├── assets/          # SVG logos
│   └── demo/            # Showcase imagery
└── backups/             # Automatic timestamped data backups
```

---

## 🔒 Production Notes

- Set `SESSION_SECRET` environment variable for production deployments.
- Change the admin password upon first login.
