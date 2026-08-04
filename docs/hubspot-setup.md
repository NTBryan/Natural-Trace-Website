# HubSpot Setup

Two separate things get called "adding HubSpot". They are unrelated and are set
up in different places.

| | What it does | Who sets it up | Where |
|---|---|---|---|
| **HubSpot Forms API** | Contact form submissions land in the HubSpot CRM | Whoever admins HubSpot | This website's CMS |
| **HubSpot MCP server** | Lets Claude read and write HubSpot during a Claude session | Each person, for themselves | Claude connector settings |

The website work is already done. Section 1 is the only thing needed to switch
it on, and it is four fields in the CMS. Section 2 is not a website change at
all.

---

## 1. Contact form to HubSpot CRM

### What happens today

Until this is switched on, the contact form opens the visitor's email client
with their message pre-filled, addressed to the inbox set in **Email fallback**.
Nothing is lost while HubSpot is off.

### Steps

**In HubSpot**

1. **Marketing -> Forms -> Create form**. Pick a blank/embedded form.
2. Add fields matching the website form: First name, Last name, Email, Company,
   Message.
3. Inquiry type is not a standard HubSpot property. Either:
   - create a custom contact property with the internal name `inquiry_type`
     (**Settings -> Properties -> Create property**, type: single-line text or
     dropdown), or
   - skip it, and clear the "Inquiry type" box in step 7 below. The field then
     is not sent, and the rest of the submission still works.
4. Publish the form.
5. Open **Share -> Embed code** and note two values:
   - **Portal ID** (also called Hub ID) — a number, e.g. `12345678`
   - **Form GUID** — a long id, e.g. `a1b2c3d4-0000-4444-8888-abcdefabcdef`

**On the website**

6. Go to `/admin/` and sign in. Open **Integrations -> HubSpot & Contact Form**.
7. Fill in:
   - **Portal ID** and **Form GUID** from step 5
   - **Data centre**: `na1` for a US portal, `eu1` if your HubSpot URLs contain
     `app-eu1`
   - **Field mapping**: leave as-is unless your HubSpot property names differ
   - **Send submissions to HubSpot**: turn on
8. Publish. The site rebuilds and submissions start flowing to HubSpot.

### Verify

Submit a test message through `/contact/` and confirm the contact appears in
HubSpot under **Contacts**. If nothing arrives, open the browser console on the
contact page — a failed submission logs the HubSpot status code there, and the
form falls back to the email client rather than failing silently.

### Never put a token in the website

Portal ID and Form GUID are designed to be used from a browser and are safe to
publish. A HubSpot **private-app token, access token, or API key is not** — this
site is static and everything in it is readable by anyone who views the page
source. There is nowhere in this repository that a secret can be stored safely.

If you need the full CRM API rather than the Forms API — custom objects, dedup
logic, reading data back — that needs a server-side component holding the token,
which the browser never sees.

That option is open. The site is deployed to **both** Netlify
(`natural-trace.netlify.app`, which is what the canonical URLs point at) and
GitHub Pages (`ntbryan.github.io/Natural-Trace-Website/`, built by
`.github/workflows/deploy.yml`). GitHub Pages cannot run a function, but Netlify
can, and it is already connected — note that there is no `netlify.toml` in this
repo, so that connection is configured on Netlify's side and is not visible from
the code.

So moving to a token-based integration would mean adding a Netlify function and
treating Netlify as the authoritative host, not migrating hosting from scratch.
Worth deciding deliberately rather than by accident, since two hosts serving the
same site is its own loose end.

### Spam

The form carries a hidden honeypot field. Submissions that fill it are dropped
silently. If spam becomes a problem, enable reCAPTCHA on the HubSpot form
itself rather than adding another script here.

---

## 2. HubSpot MCP server, for Claude

This gives Claude access to HubSpot inside a Claude session — asking about
deals, updating contacts, summarising a pipeline. It has nothing to do with the
website and does not affect the contact form.

Each person authorises it for their own account:

1. In Claude, open connector settings and find the HubSpot connector.
2. Authorise it. HubSpot's own OAuth screen handles sign-in and asks which
   scopes to grant — Claude never sees the password.
3. Grant the narrowest scopes that cover the work. Read-only is enough for
   reporting and pipeline questions; write scopes are only needed to change
   records.

Notes:

- Authorisation is per person and per account. One person connecting it does
  not connect it for everyone.
- It can be revoked at any time from HubSpot under
  **Settings -> Integrations -> Connected Apps**.
- An MCP connection is not a substitute for section 1. It does not route form
  submissions anywhere.

---

## Files involved

| File | Purpose |
|---|---|
| `src/_data/integrations.yml` | The configuration. Editable in the CMS under Integrations. |
| `src/pages/contact.njk` | Form markup; passes config to the browser on `data-` attributes. |
| `src/assets/js/main.js` | `handleContactSubmit` and helpers; chooses HubSpot or the email fallback. |
| `src/_data/contact.yml` | Success, fallback, and error copy. Editable in the CMS under Contact. |
