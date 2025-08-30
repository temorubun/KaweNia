export default {
  async fetch(req, env, ctx) {
    const u = new URL(req.url);

    // Healthcheck
    if (u.pathname === "/ping") {
      return new Response("pong " + new Date().toISOString(), {
        headers: { "content-type": "text/plain" },
      });
    }

    // Ambil FILE_ID dari /v/<FILE_ID> atau ?id=<FILE_ID>
    let fileId = null;
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts[0] === "data" && parts[1]) fileId = parts[1];
    if (!fileId) fileId = u.searchParams.get("id");
    if (!fileId) return new Response("Missing id", { status: 400 });
    if (!/^[A-Za-z0-9_-]+$/.test(fileId)) return new Response("Invalid id", { status: 400 });

    // URL GAS /exec – boleh pakai env var kalau Anda simpan di Settings → Variables
    const GAS_BASE = (env && env.GAS_BASE) ||
      "https://script.google.com/macros/s/AKfycbx-AtBawGKYgJIh5LgT8IMSqadSy-UgR8PHNfVqRXeR40gVCkh7ZOehGaxb5LnH1GIR/exec";

    const target = `${GAS_BASE}?id=${encodeURIComponent(fileId)}`;

    // Debug: tampilkan target
    if (u.searchParams.get("debug") === "1") {
      return new Response(`target=${target}`, { headers: { "content-type": "text/plain" } });
    }

    // Ambil isi HTML sebagai TEXT (jangan forward header upstream)
    const upstream = await fetch(target, { headers: { Accept: "text/html" } });
    let html = await upstream.text();

    // Tambahkan <base> agar semua path relatif (CSS/JS/img) resolve ke GAS
    if (/<head[^>]*>/i.test(html) && !/<base\s+/i.test(html)) {
      html = html.replace(/<head([^>]*)>/i, `<head$1><base href="${GAS_BASE}">`);
    }

    // Kembalikan sebagai HTML mentah (PAKSA content-type)
    return new Response(html, {
      status: upstream.status,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  },
};
