const icons = require('./dist/icons.json');
const meta = require('./dist/meta.json');
const APP_VERSION = meta && typeof meta.version === 'string' ? meta.version : '0.0.0';
const iconNameList = [...new Set(Object.keys(icons).map(i => i.split('-')[0]))];
const shortNames = {
  js: 'javascript',
  ts: 'typescript',
  py: 'python',
  tailwind: 'tailwindcss',
  vue: 'vuejs',
  nuxt: 'nuxtjs',
  go: 'golang',
  cf: 'cloudflare',
  wasm: 'webassembly',
  postgres: 'postgresql',
  k8s: 'kubernetes',
  next: 'nextjs',
  mongo: 'mongodb',
  md: 'markdown',
  ps: 'photoshop',
  ai: 'illustrator',
  pr: 'premiere',
  ae: 'aftereffects',
  scss: 'sass',
  sc: 'scala',
  net: 'dotnet',
  gatsbyjs: 'gatsby',
  gql: 'graphql',
  vlang: 'v',
  amazonwebservices: 'aws',
  bots: 'discordbots',
  express: 'expressjs',
  googlecloud: 'gcp',
  mui: 'materialui',
  windi: 'windicss',
  unreal: 'unrealengine',
  nest: 'nestjs',
  ktorio: 'ktor',
  pwsh: 'powershell',
  au: 'audition',
  rollup: 'rollupjs',
  rxjs: 'reactivex',
  rxjava: 'reactivex',
  ghactions: 'githubactions',
  sklearn: 'scikitlearn',
};
const themedIcons = [
  ...Object.keys(icons)
    .filter(i => i.includes('-light') || i.includes('-dark'))
    .map(i => i.split('-')[0]),
];

const ICONS_PER_LINE = 15;
const ONE_ICON = 48;
const SCALE = ONE_ICON / (300 - 44);

const MAX_ICON_PARAM_LENGTH = 2048;
const MAX_ICONS = 200;

function getOptionalGlobal(name) {
  try {
    return typeof globalThis !== 'undefined' ? globalThis[name] : undefined;
  } catch {
    return undefined;
  }
}

function getSvgsApiKey() {
  // In Workers (service-worker syntax), secrets/vars can be exposed as globals.
  // Using typeof guards avoids ReferenceError when not bound.
  const direct = typeof SVGS_API_KEY !== 'undefined' ? SVGS_API_KEY : undefined;
  return direct ?? getOptionalGlobal('SVGS_API_KEY');
}

function getLogSampleRate() {
  const direct = typeof LOG_SAMPLE_RATE !== 'undefined' ? LOG_SAMPLE_RATE : undefined;
  const value = direct ?? getOptionalGlobal('LOG_SAMPLE_RATE');
  const parsed = Number.parseFloat(String(value ?? '0.01'));
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  if (parsed > 1) return 1;
  return parsed;
}

function shouldLog(request) {
  const ua = (request.headers.get('user-agent') || '').toLowerCase();
  if (ua.includes('vitest') || ua.includes('node')) return false;
  return Math.random() < getLogSampleRate();
}

function normalizeIconParam(iconParam) {
  if (!iconParam) return [];
  return iconParam
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);
}

function parseTheme(searchParams) {
  const theme = (searchParams.get('t') || searchParams.get('theme') || '')
    .trim()
    .toLowerCase();
  if (!theme) return 'dark';
  if (theme !== 'dark' && theme !== 'light') return null;
  return theme;
}

function parsePerLine(searchParams) {
  const raw = (searchParams.get('perline') || '').trim();
  if (!raw) return ICONS_PER_LINE;
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value)) return null;
  if (value < 1 || value > 50) return null;
  return value;
}

function generateSvg(iconNames, perLine) {
  const iconSvgList = iconNames.map(i => icons[i]);

  const length = Math.min(perLine * 300, iconNames.length * 300) - 44;
  const height = Math.ceil(iconSvgList.length / perLine) * 300 - 44;
  const scaledHeight = height * SCALE;
  const scaledWidth = length * SCALE;

  return `
  <svg width="${scaledWidth}" height="${scaledHeight}" viewBox="0 0 ${length} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1">
    ${iconSvgList
      .map(
        (i, index) =>
          `
        <g transform="translate(${(index % perLine) * 300}, ${
            Math.floor(index / perLine) * 300
          })">
          ${i}
        </g>
        `
      )
      .join(' ')}
  </svg>
  `;
}

function resolveIcons(requestedNames, theme) {
  const resolved = [];
  const invalid = [];

  for (const rawName of requestedNames) {
    const name = rawName.trim().toLowerCase();
    if (!name) continue;

    let base = null;
    if (iconNameList.includes(name)) base = name;
    else if (name in shortNames) base = shortNames[name];

    if (!base) {
      invalid.push(rawName);
      continue;
    }

    const themedName = themedIcons.includes(base) ? `${base}-${theme}` : base;
    if (!(themedName in icons)) {
      invalid.push(rawName);
      continue;
    }

    resolved.push(themedName);
  }

  return { resolved, invalid };
}

async function computeEtag(text) {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const hash = Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return `"${hash}"`;
}

function withCacheHeaders(headers, cacheControl) {
  headers.set('Cache-Control', cacheControl);
  return headers;
}

async function handleRequest(request) {
  const start = Date.now();

  const { pathname, searchParams } = new URL(request.url);

  const path = pathname.replace(/^\/|\/$/g, '');

  if (path === '') {
    const base = (() => {
      try {
        return new URL(request.url).origin;
      } catch {
        return 'http://127.0.0.1:8787';
      }
    })();

    const examples = {
      icons: `${base}/icons?i=js,html,css&theme=light&perline=3`,
      iconsAll: `${base}/icons?i=all&theme=dark`,
      apiIcons: `${base}/api/icons`,
    };

    const body = `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>skill-icons v${APP_VERSION}</title>
  </head>
  <body>
    <h1>OK <small>v${APP_VERSION}</small></h1>
    <p>Servicio activo. Usa los endpoints:</p>
    <ul>
      <li><a href="${examples.icons}">/icons (ejemplo)</a></li>
      <li><a href="${examples.iconsAll}">/icons?i=all (ejemplo)</a></li>
      <li><a href="${examples.apiIcons}">/api/icons</a></li>
    </ul>
    <p>Tip: agrega <code>If-None-Match</code> para validar ETag.</p>
  </body>
</html>`;

    const headers = new Headers({ 'content-type': 'text/html; charset=UTF-8' });
    withCacheHeaders(headers, 'public, max-age=60');
    headers.set('Server-Timing', `app;dur=${Date.now() - start}`);
    return new Response(body, { status: 200, headers });
  }

  // Avoid noisy 500s from browsers requesting these by default.
  if (pathname === '/favicon.ico') {
    const headers = new Headers();
    withCacheHeaders(headers, 'public, max-age=86400');
    return new Response(null, { status: 204, headers });
  }

  if (pathname === '/robots.txt') {
    const headers = new Headers({ 'content-type': 'text/plain; charset=UTF-8' });
    withCacheHeaders(headers, 'public, max-age=86400');
    return new Response('User-agent: *\nDisallow: /\n', { status: 200, headers });
  }

  if (path === 'icons') {
    const iconParam = searchParams.get('i') || searchParams.get('icons');
    if (!iconParam)
      return new Response("You didn't specify any icons!", { status: 400 });

    if (iconParam.length > MAX_ICON_PARAM_LENGTH)
      return new Response('icons param is too long', { status: 413 });

    const theme = parseTheme(searchParams);
    if (!theme)
      return new Response('Theme must be either "light" or "dark"', {
        status: 400,
      });

    const perLine = parsePerLine(searchParams);
    if (!perLine)
      return new Response('Icons per line must be a number between 1 and 50', {
        status: 400,
      });

    const normalized = iconParam.trim().toLowerCase();
    const requested =
      normalized === 'all' ? iconNameList : normalizeIconParam(iconParam);

    if (requested.length > MAX_ICONS)
      return new Response(`Too many icons requested (max ${MAX_ICONS}).`, {
        status: 413,
      });

    const { resolved, invalid } = resolveIcons(requested, theme);
    if (invalid.length > 0)
      return new Response(
        `Unknown icon id(s): ${invalid.join(', ')}. See /api/icons for supported ids.`,
        { status: 400 }
      );
    if (resolved.length === 0)
      return new Response('No valid icons requested.', { status: 400 });

    const svg = generateSvg(resolved, perLine);

    const etag = await computeEtag(svg);
    const isNotModified = request.headers.get('if-none-match') === etag;
    if (isNotModified) {
      const response = new Response(null, {
        status: 304,
        headers: withCacheHeaders(new Headers({ ETag: etag }), 'public, max-age=86400'),
      });
      if (shouldLog(request)) {
        console.log(
          JSON.stringify({
            level: 'info',
            event: 'request',
            path,
            status: 304,
            durationMs: Date.now() - start,
            icons: resolved.length,
            theme,
            perLine,
            cache: 'etag',
          })
        );
      }
      return response;
    }

    const headers = new Headers({
      'Content-Type': 'image/svg+xml; charset=UTF-8',
      ETag: etag,
    });
    withCacheHeaders(headers, 'public, max-age=86400');
    headers.set('Server-Timing', `app;dur=${Date.now() - start}`);

    const response = new Response(svg, { headers });
    if (shouldLog(request)) {
      console.log(
        JSON.stringify({
          level: 'info',
          event: 'request',
          path,
          status: 200,
          durationMs: Date.now() - start,
          icons: resolved.length,
          theme,
          perLine,
        })
      );
    }
    return response;
  } else if (path === 'api/icons') {
    const body = JSON.stringify(iconNameList);
    const etag = await computeEtag(body);
    const isNotModified = request.headers.get('if-none-match') === etag;
    if (isNotModified) {
      const response = new Response(null, {
        status: 304,
        headers: withCacheHeaders(new Headers({ ETag: etag }), 'public, max-age=86400'),
      });
      if (shouldLog(request)) {
        console.log(
          JSON.stringify({
            level: 'info',
            event: 'request',
            path,
            status: 304,
            durationMs: Date.now() - start,
            cache: 'etag',
          })
        );
      }
      return response;
    }

    const headers = new Headers({
      'content-type': 'application/json;charset=UTF-8',
      ETag: etag,
    });
    withCacheHeaders(headers, 'public, max-age=86400');
    const response = new Response(body, { headers });
    if (shouldLog(request)) {
      console.log(
        JSON.stringify({
          level: 'info',
          event: 'request',
          path,
          status: 200,
          durationMs: Date.now() - start,
        })
      );
    }
    return response;
  } else if (path === 'api/svgs') {
    const svgsApiKey = getSvgsApiKey();
    if (!svgsApiKey) return new Response('Not Found', { status: 404 });

    const providedKey =
      request.headers.get('x-api-key') || searchParams.get('key') || '';
    if (!providedKey || providedKey !== svgsApiKey)
      return new Response('Unauthorized', { status: 401 });

    const body = JSON.stringify(icons);
    const etag = await computeEtag(body);
    const isNotModified = request.headers.get('if-none-match') === etag;
    if (isNotModified) {
      const response = new Response(null, {
        status: 304,
        headers: withCacheHeaders(new Headers({ ETag: etag }), 'public, max-age=86400'),
      });
      if (shouldLog(request)) {
        console.log(
          JSON.stringify({
            level: 'info',
            event: 'request',
            path,
            status: 304,
            durationMs: Date.now() - start,
            cache: 'etag',
          })
        );
      }
      return response;
    }

    const headers = new Headers({
      'content-type': 'application/json;charset=UTF-8',
      ETag: etag,
    });
    withCacheHeaders(headers, 'public, max-age=86400');
    const response = new Response(body, { headers });
    if (shouldLog(request)) {
      console.log(
        JSON.stringify({
          level: 'info',
          event: 'request',
          path,
          status: 200,
          durationMs: Date.now() - start,
          protected: true,
        })
      );
    }
    return response;
  } else {
    return new Response('Not Found', { status: 404 });
  }
}

if (typeof addEventListener === 'function') {
  addEventListener('fetch', event => {
    event.respondWith(
      handleRequest(event.request).catch(err => {
        console.error(
          JSON.stringify({
            level: 'error',
            event: 'unhandled',
            message: err?.message,
            stack: err?.stack,
          })
        );
        return new Response('Internal Server Error', { status: 500 });
      })
    );
  });
}

if (typeof module !== 'undefined') {
  module.exports = {
    handleRequest,
    _internal: {
      normalizeIconParam,
      parseTheme,
      parsePerLine,
      resolveIcons,
      computeEtag,
    },
  };
}
