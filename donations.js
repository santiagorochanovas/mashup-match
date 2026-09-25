// V1.6: muestra el apoyo voluntario solamente si hay un enlace real y seguro.
(() => {
  const raw = (window.MASHUP_SUPPORT?.url || '').trim();
  if (!raw) return;

  let url;
  try { url = new URL(raw); } catch { console.warn('Mashup Match: enlace de apoyo no valido.'); return; }
  // No permiten enlaces javascript:, data: ni dominios imitados.
  const supported = ['ko-fi.com', 'paypal.me', 'cafecito.app', 'buymeacoffee.com'];
  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  if (url.protocol !== 'https:' || !supported.includes(host) || url.username || url.password || url.pathname === '/') {
    console.warn('Mashup Match: usa un enlace HTTPS a tu perfil de Ko-fi, PayPal.Me, Cafecito o Buy Me a Coffee.');
    return;
  }

  ['donateHeader', 'donateFooter'].forEach(id => {
    const link = document.getElementById(id);
    if (!link) return;
    link.href = url.toString();
    link.classList.remove('hidden');
  });
  document.getElementById('supportFooter')?.classList.remove('hidden');
})();
