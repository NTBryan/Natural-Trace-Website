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

**Do these in order.** The Worker has to exist before you can register the OAuth
App, because GitHub will not accept a callback URL until it is a real address.
Registering first and inventing a URL fails with "Callback URL must be a valid
URL".

### 1. Deploy the handler first, with placeholder values

From the `oauth/` folder, with Node installed:

```
npm install -g wrangler
wrangler login
wrangler deploy
```

It deploys even though `GITHUB_CLIENT_ID` is still the placeholder and there is
no secret yet. It will not work yet either. The only thing you need from this
step is the URL wrangler prints at the end, which looks like:

```
https://natural-trace-cms-auth.natural-trace.workers.dev
```

Deployed on 7 Aug 2026 as
`https://natural-trace-cms-auth.natural-trace.workers.dev`. The `natural-trace`
part is the account-wide workers.dev subdomain, shared by anything else Natural
Trace deploys on Cloudflare. Changing it breaks every worker URL under it.

Put the Cloudflare account in the company's name, not a personal one.

### 2. Register a GitHub OAuth App

GitHub → your organisation → Settings → Developer settings → OAuth Apps → New
OAuth App. Register it **under the Natural-Trace organisation**, not your
personal account, or the CMS stops working the day that account closes.

| Field | Value |
| --- | --- |
| Application name | Natural Trace CMS |
| Homepage URL | `https://natural-trace.github.io/Natural-Trace-Website/` |
| Authorization callback URL | the URL from step 1, with `/callback` on the end |

So the callback is the real deployed address, for example
`https://natural-trace-cms-auth.natural-trace.workers.dev/callback`. Anything in
angle brackets is a placeholder to replace, not something to paste.

You now have a **Client ID**, and can generate a **Client Secret**. The Client ID
is public and goes in `wrangler.toml`. The Client Secret is a password: it goes
into Cloudflare in step 3 and must never be pasted into this repository, a chat,
or an email.

The callback URL can be edited later, so if you have already registered an app
with the wrong URL, fix it there rather than making a second one.

### 3. Give the handler its credentials

In `oauth/wrangler.toml`, set `GITHUB_CLIENT_ID` to the Client ID. Then:

```
wrangler secret put GITHUB_CLIENT_SECRET     # paste the secret when prompted
wrangler deploy
```

### 4. Point the CMS at it

In `src/admin/config.yml`, set `base_url` to the URL from step 1, with no
trailing slash and no path:

```yaml
backend:
  name: github
  repo: Natural-Trace/Natural-Trace-Website
  branch: main
  base_url: https://natural-trace-cms-auth.natural-trace.workers.dev
  auth_endpoint: auth
```

Check that `ALLOWED_ORIGINS` in `wrangler.toml` lists the live site. That list is
what stops the handler handing tokens to someone else's website, so keep it to
the sites that actually exist, plus `http://localhost:8080` while anyone is
working locally.

Commit, push, and the admin panel works.

## Cost

Cloudflare's Workers free tier covers 100,000 requests a day, which is far beyond
anything a handful of editors signing in will ever use. Confirm the free tier's
terms permit commercial use before relying on it; the paid plan is $5 a month and
removes the question. Either way it is less than the Netlify plan it replaces.

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
