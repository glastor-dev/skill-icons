const { handleRequest } = require('../index.js');

function req(url, init) {
  return new Request(url, init);
}

describe('worker', () => {
  it('renders svg for valid icons', async () => {
    const res = await handleRequest(
      req('http://localhost/icons?i=js,html&theme=dark&perline=2')
    );
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toMatch(/image\/svg\+xml/i);
    const body = await res.text();
    expect(body).toContain('<svg');
    expect(body).toContain('</svg>');
    expect(res.headers.get('etag')).toBeTruthy();
  });

  it('returns 304 when If-None-Match matches', async () => {
    const first = await handleRequest(req('http://localhost/icons?i=js,html'));
    expect(first.status).toBe(200);
    const etag = first.headers.get('etag');
    const second = await handleRequest(
      req('http://localhost/icons?i=js,html', {
        headers: { 'if-none-match': etag },
      })
    );
    expect(second.status).toBe(304);
  });

  it('rejects unknown icons', async () => {
    const res = await handleRequest(req('http://localhost/icons?i=notreal'));
    expect(res.status).toBe(400);
    const body = await res.text();
    expect(body.toLowerCase()).toContain('unknown');
  });

  it('validates perline range', async () => {
    const res = await handleRequest(req('http://localhost/icons?i=js&perline=0'));
    expect(res.status).toBe(400);
  });

  it('protects /api/svgs when no key configured', async () => {
    const res = await handleRequest(req('http://localhost/api/svgs'));
    expect(res.status).toBe(404);
  });

  it('requires key for /api/svgs when configured', async () => {
    globalThis.SVGS_API_KEY = 'secret';

    const unauth = await handleRequest(req('http://localhost/api/svgs'));
    expect(unauth.status).toBe(401);

    const ok = await handleRequest(
      req('http://localhost/api/svgs', { headers: { 'x-api-key': 'secret' } })
    );
    expect(ok.status).toBe(200);
    expect(ok.headers.get('content-type')).toMatch(/application\/json/i);

    delete globalThis.SVGS_API_KEY;
  });
});
