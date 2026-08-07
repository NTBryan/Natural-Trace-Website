# Signing in to the CMS

Last updated 7 August 2026.

The admin panel is at `/admin` on the live site. Editors sign in with their
GitHub account. Anyone who can sign in can publish, so the invite list is the
access list: it is the set of people with write access to the repository.

## Why this changed

The CMS used to sign people in through Git Gateway, a Netlify service. Two
problems with that:

1. **Netlify deprecated it.** They still patch security holes but have stopped
   fixing bugs and advise against new setups. It was going to stop working.
2. **It only ever worked on the Netlify URL.** Git Gateway needs a
   `/.netlify/identity` endpoint that exists on Netlify and nowhere else. On
   GitHub Pages, which is where the site actually lives, `/admin` loaded and then
   could not log anyone in.

The GitHub backend talks to GitHub directly. The only thing a browser cannot do
is trade the login code for an access token, because that needs a client secret
and a browser cannot keep one. So a small handler does that one step. Its source
is in `oauth/worker.js` in this repository, about a hundred lines, and nothing
else about the site depends on it.

## What you need to do once

Three steps. After this, editors just click "Login with GitHub".

### 1. Register a GitHub OAuth App

GitHub → Settings → Developer settings → OAuth Apps → New OAuth App.

| Field | Value |
| --- | --- |
| Application name | Natural Trace CMS |
| Homepage URL | `https://ntbryan.github.io/Natural-Trace-Website/` |
| Authorization callback URL | `https://natural-trace-cms-auth.<your-subdomain>.workers.dev/callback` |

You get a **Client ID** and can generate a **Client Secret**. The Client ID is
public and goes in `oauth/wrangler.toml`. The Client Secret is a password: it
goes into Cloudflare in step 2 and must never be pasted into this repository, a
chat, or an email.

Register the app under a **company GitHub organisation**, not a personal
account. If it is personal, the CMS stops working the day that account is
closed.

### 2. Deploy the handler

Once, from the `oauth/` folder, with Node installed:

```
npm install -g wrangler
wrangler login
```

Edit `wrangler.toml` and set `GITHUB_CLIENT_ID` to the Client ID from step 1.
Then:

```
wrangler secret put GITHUB_CLIENT_SECRET     # paste the secret when prompted
wrangler deploy
```

Wrangler prints the deployed URL. It looks like
`https://natural-trace-cms-auth.<subdomain>.workers.dev`.

Cloudflare's Workers plan is $5 a month, which is less than the Netlify plan this
replaces, and the account should be in the company's name. Check whether the free
tier's terms permit commercial use before relying on it; the paid plan removes
the question.

### 3. Point the CMS at it

In `src/admin/config.yml`, set `base_url` to the URL wrangler printed, with no
trailing slash and no path:

```yaml
backend:
  name: github
  repo: NTBryan/Natural-Trace-Website
  branch: main
  base_url: https://natural-trace-cms-auth.<subdomain>.workers.dev
  auth_endpoint: auth
```

Also add the site's origin to `ALLOWED_ORIGINS` in `wrangler.toml` and redeploy.
That list is what stops the handler being used to hand tokens to someone else's
website. It should contain the live site and nothing else, plus
`http://localhost:8080` while anyone is working locally.

Commit, push, and the admin panel works.

## Giving someone access

Add them as a collaborator on the repository with **Write** permission. That is
the whole of it: there is no separate CMS user list to keep in step any more.

Removing someone is the same in reverse, and it takes effect immediately.

## When things move

Three values need changing, and forgetting any one of them breaks the login
silently rather than loudly.

| When | Change |
| --- | --- |
| Repository moves to a company organisation | `repo` in `config.yml`, Homepage URL on the OAuth App |
| Site cuts over to natural-trace.com | `ALLOWED_ORIGINS` in `wrangler.toml`, Homepage URL on the OAuth App |
| Handler is redeployed to a different name | `base_url` in `config.yml`, callback URL on the OAuth App |

## If the login stops working

Open the browser console on `/admin` and try to sign in. The popup reports the
reason in plain words.

| What you see | What it means |
| --- | --- |
| Popup opens, then closes with no message | `base_url` in `config.yml` is wrong or the Worker is not deployed |
| "Login state did not match" | Cookies are blocked, or the login was left open more than ten minutes. Try again |
| GitHub says "redirect_uri mismatch" | The callback URL on the OAuth App does not match the deployed Worker |
| Signs in, then "not authorized" | That GitHub account does not have write access to the repository |
| Nothing happens at all | `ALLOWED_ORIGINS` does not include the site you are on |

## Rolling back

Set `backend.name` back to `git-gateway` and remove `repo`, `base_url` and
`auth_endpoint`. That only works on the Netlify URL and only for as long as
Netlify keeps Git Gateway alive, so treat it as an emergency measure, not an
option.

## What this does not depend on

Worth being clear, because the point of the change was to remove single points
of failure. If the Worker disappears, the **website is unaffected**. Every page
still serves. The only thing that stops is browser-based editing, and the content
can still be changed by editing the files in the repository directly. The site
itself has no runtime dependency on any of this.
