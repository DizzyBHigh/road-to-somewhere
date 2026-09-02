document.addEventListener('DOMContentLoaded', async () => {
  const target = document.querySelector('[data-download-count]');
  const page = document.querySelector('.product-page');
  if (!target || !page || !window.supabase) return;

  const client = await new Promise(resolve => {
    if (window.rtsSupabase) return resolve(window.rtsSupabase);
    window.addEventListener('rts-auth-state', () => resolve(window.rtsSupabase), { once: true });
  });
  if (!client) return;

  const slug = page.dataset.productSlug;
  if (!slug) return;

  const { data, error } = await client.rpc('get_product_download_count', {
    product_slug: slug
  });
  if (!error && data !== null) {
    const count = Number(data);
    target.textContent = `${count.toLocaleString()} download${count === 1 ? '' : 's'}`;
  }
});
