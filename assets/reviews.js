document.addEventListener('DOMContentLoaded', async () => {
  const root = document.querySelector('[data-extension-slug]');
  if (!root || !window.supabase) return;
  const list = root.querySelector('[data-review-list]');
  const summary = root.querySelector('[data-review-summary]');
  const state = root.querySelector('[data-review-form-state]');
  const form = root.querySelector('[data-review-form]');
  const message = root.querySelector('[data-review-message]');
  const client = window.supabase.createClient(
    'https://osiuynezqmocapioekoa.supabase.co',
    'sb_publishable_84QJd8PHmw-79UJmVwz05g_u0exvb9w'
  );

  const escape = value => String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const stars = rating => '★'.repeat(Number(rating)) + '☆'.repeat(5 - Number(rating));

  const { data: extension, error: extensionError } = await client
    .from('extensions').select('id').eq('slug', root.dataset.extensionSlug).single();
  if (extensionError) {
    list.innerHTML = '<p class="reviews-empty">Reviews are temporarily unavailable.</p>';
    return;
  }

  const loadReviews = async () => {
    const { data, error } = await client.from('reviews')
      .select('id, user_id, rating, title, body, created_at, updated_at, profiles(display_name, avatar_url)')
      .eq('extension_id', extension.id).eq('published', true)
      .order('created_at', { ascending: false });
    if (error) {
      list.innerHTML = '<p class="reviews-empty">Reviews are temporarily unavailable.</p>';
      return;
    }
    const average = data.length ? data.reduce((sum, r) => sum + Number(r.rating), 0) / data.length : 0;
    summary.textContent = data.length ? `${average.toFixed(1)} / 5 · ${data.length} review${data.length === 1 ? '' : 's'}` : 'No reviews yet';
    list.innerHTML = data.length ? data.map(review => `
      <article class="review-card">
        <div class="review-card__top"><strong>${escape(review.profiles?.display_name || 'RTS user')}</strong><span>${stars(review.rating)}</span></div>
        <h3>${escape(review.title)}</h3><p>${escape(review.body)}</p>
      </article>`).join('') : '<p class="reviews-empty">Be the first to review this extension.</p>';
  };

  const { data: sessionData } = await client.auth.getSession();
  const user = sessionData.session?.user;
  if (!user) state.textContent = 'Sign in with Discord to leave a review.';
  else {
    const { data: own } = await client.from('reviews').select('id,rating,title,body')
      .eq('extension_id', extension.id).eq('user_id', user.id).maybeSingle();
    state.textContent = own ? 'Edit your review.' : 'Share your experience.';
    form.hidden = false;
    if (own) {
      form.rating.value = own.rating; form.title.value = own.title || ''; form.body.value = own.body || '';
      form.querySelector('button').textContent = 'Update review';
    }
    form.addEventListener('submit', async event => {
      event.preventDefault(); message.textContent = 'Saving…';
      const values = Object.fromEntries(new FormData(form));
      const payload = { extension_id: extension.id, user_id: user.id, rating: Number(values.rating), title: values.title.trim(), body: values.body.trim() };
      const result = own
        ? await client.from('reviews').update(payload).eq('id', own.id).eq('user_id', user.id)
        : await client.from('reviews').insert(payload);
      if (result.error) message.textContent = `Could not save review: ${result.error.message}`;
      else { message.textContent = 'Review submitted for moderation.'; await loadReviews(); }
    });
  }
  await loadReviews();
});
