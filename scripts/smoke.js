/* eslint-disable no-console */

const BASE_URL = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:8787';

async function fetchText(url, options) {
  const res = await fetch(url, options);
  const text = await res.text();
  return { res, text };
}

function fail(message) {
  console.error(`SMOKE FAIL: ${message}`);
  process.exitCode = 1;
}

function ok(message) {
  console.log(`SMOKE OK: ${message}`);
}

async function main() {
  const iconsUrl = `${BASE_URL}/icons?i=js,html,css&theme=light&perline=3`;

  // 1) /icons returns SVG + ETag
  let r;
  try {
    r = await fetchText(iconsUrl);
  } catch (err) {
    fail(`No se pudo conectar a ${BASE_URL}. ¿Está corriendo 'yarn dev'? (${err?.message || err})`);
    return;
  }

  if (r.res.status !== 200) fail(`/icons esperado 200, recibido ${r.res.status}`);
  const ct = r.res.headers.get('content-type') || '';
  if (!ct.toLowerCase().includes('image/svg+xml')) fail(`/icons Content-Type esperado image/svg+xml, recibido '${ct}'`);
  const etag = r.res.headers.get('etag');
  if (!etag) fail('/icons debe incluir header ETag');
  if (!r.text.includes('<svg')) fail('/icons debe devolver un SVG (falta <svg)');
  ok(`/icons 200 + SVG + ETag (${etag || 'sin etag'})`);

  // 2) ETag revalidation returns 304
  if (etag) {
    const r2 = await fetchText(iconsUrl, { headers: { 'If-None-Match': etag } });
    if (r2.res.status !== 304) fail(`/icons con If-None-Match esperado 304, recibido ${r2.res.status}`);
    ok('/icons devuelve 304 con If-None-Match');
  }

  // 3) Unknown icon returns 400
  const badUrl = `${BASE_URL}/icons?i=js,noexiste&theme=light&perline=3`;
  const r3 = await fetchText(badUrl);
  if (r3.res.status !== 400) fail(`/icons con id inválido esperado 400, recibido ${r3.res.status}`);
  ok('/icons rechaza IDs inválidos con 400');

  // 4) /favicon.ico should not 500
  const fav = await fetch(`${BASE_URL}/favicon.ico`);
  if (fav.status !== 204) fail(`/favicon.ico esperado 204, recibido ${fav.status}`);
  ok('/favicon.ico responde 204 (sin 500s ruidosos)');

  if (process.exitCode) {
    console.log('SMOKE: terminó con fallos.');
  } else {
    console.log('SMOKE: todo OK.');
  }
}

main().catch(err => {
  fail(err?.stack || err?.message || String(err));
});
