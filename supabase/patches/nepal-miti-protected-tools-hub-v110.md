# Supabase protected-app tools hub patch (live v110)

This records the minimal live-only workaround applied to `nepal-miti-protected`.
It deliberately avoids replacing the large protected function in Git.

Live function after patch:
- slug: `nepal-miti-protected`
- version: `110`
- EZBR SHA-256: `647057bf292b6c03eba68a57b7643fdfe841407a16001d884862de0554dbb910`

## Route insertion

Inside the main `Deno.serve` request handler, before the normal page handlers:

```ts
if(p==='/tools-hub') return secureResponse(
  new Response(null,{
    status:307,
    headers:{location:'/explore?view=tools','cache-control':'no-store'}
  })
);

if(p==='/explore'&&u.searchParams.get('view')==='tools'){
  const supabaseBase =
    Deno.env.get('SUPABASE_URL') ||
    'https://pxlsmxbpgdfzjzuqtict.supabase.co';

  const hub = await fetch(
    supabaseBase + '/functions/v1/router/tools-hub',
    {
      headers:{accept:'text/html'},
      signal:AbortSignal.timeout(5000)
    }
  );

  if(!hub.ok) {
    return secureResponse(new Response(
      'Tools directory unavailable',
      {
        status:502,
        headers:{
          'content-type':'text/plain; charset=utf-8',
          'cache-control':'no-store'
        }
      }
    ));
  }

  return secureResponse(new Response(
    await hub.text(),
    {
      status:200,
      headers:{
        'content-type':'text/html; charset=utf-8',
        'cache-control':'public, max-age=60, s-maxage=300',
        'x-robots-tag':'noindex'
      }
    }
  ));
}
```

## Home shortcut replacement

Replace the old home shortcut:

```html
<a href="/tithi" ...>🧰 पात्रो+</a>
```

with:

```html
<a href="/explore?view=tools" ...>⌨ Typing Tools</a>
```

Do not change the existing Explore TV button or the `/explore` launcher.

## Verified production behavior

On 2026-09-29:
- `/explore?view=tools` -> HTTP 200, `text/html; charset=utf-8`
- `/tools-hub` -> redirects/follows to the same rendered hub
- hub contains Typing Tools, तिथि, Diaspora, कार्ड, परिवार, API and मेरो डेटा
- root home contains Typing Tools and no `पात्रो+` label

The canonical `/tools` route still requires one successful Vercel build because Vercel owns that static rewrite.
