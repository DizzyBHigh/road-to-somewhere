document.addEventListener('DOMContentLoaded', async () => {
  const root = document.querySelector('[data-extension-slug]');
  if (!root || !window.supabase) return;
  const list = root.querySelector('[data-review-list]');
  const summary = root.querySelector('[data-review-summary]');
  const state = root.querySelector('[data-review-form-state]');
  const signin = root.querySelector('[data-review-signin]');
  const form = root.querySelector('[data-review-form]');
  const message = root.querySelector('[data-review-message]');
  const client = window.supabase.createClient('https://osiuynezqmocapioekoa.supabase.co', 'sb_publishable_84QJd8PHmw-79UJmVwz05g_u0exvb9w');
  const escape = value => String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const stars = rating => '★'.repeat(Number(rating)) + '☆'.repeat(5 - Number(rating));
  const cleanUrl = () => `${window.location.origin}${window.location.pathname}${window.location.search}`;
  const { data: extension, error: extensionError } = await client.from('extensions').select('id').eq('slug', root.dataset.extensionSlug).single();
  if (extensionError) { list.innerHTML = '<p class="reviews-empty">Reviews are temporarily unavailable.</p>'; return; }

  const loadReviews = async () => {
    const { data, error } = await client.from('reviews').select('id,user_id,rating,body,created_at,status,profiles(display_name,avatar_url)').eq('extension_id', extension.id).eq('status', 'published').order('created_at', { ascending: false });
    if (error) { list.innerHTML = '<p class="reviews-empty">Reviews are temporarily unavailable.</p>'; return; }
    const average = data.length ? data.reduce((sum, r) => sum + Number(r.rating), 0) / data.length : 0;
    summary.textContent = data.length ? `${average.toFixed(1)} / 5 · ${data.length} review${data.length === 1 ? '' : 's'}` : 'No reviews yet';
    list.innerHTML = data.length ? data.map(review => `<article class="review-card"><div class="review-card__top"><strong>${escape(review.profiles?.display_name || 'RTS user')}</strong><span>${stars(review.rating)}</span></div><p>${escape(review.body)}</p></article>`).join('') : '<p class="reviews-empty">Be the first to review this extension.</p>';
  };

  const showUser = async user => {
    if (!user) {
      state.textContent = 'Sign in with Discord to leave a review.';
      signin.hidden = false;
      form.hidden = true;
      return;
    }
    signin.hidden = true;
    const { data: own } = await client.from('reviews').select('id,rating,body,status').eq('extension_id', extension.id).eq('user_id', user.id).maybeSingle();
    state.textContent = own ? (own.status === 'pending' ? 'Your review is awaiting moderation.' : 'Edit your review.') : 'Share your experience.';
    form.hidden = false;
    if (own) { form.rating.value = own.rating; form.body.value = own.body || ''; form.querySelector('button').textContent = 'Update review'; }
    form.onsubmit = async event => {
      event.preventDefault(); message.textContent = 'Saving…';
      const values = Object.fromEntries(new FormData(form));
      const payload = { extension_id: extension.id, user_id: user.id, rating: Number(values.rating), body: values.body.trim(), status: 'pending' };
      const result = own ? await client.from('reviews').update(payload).eq('id', own.id).eq('user_id', user.id) : await client.from('reviews').insert(payload);
      message.textContent = result.error ? `Could not save review: ${result.error.message}` : 'Review submitted for moderation.';
      if (!result.error) { state.textContent = 'Your review is awaiting moderation.'; await loadReviews(); }
    };
  };

  signin.addEventListener('click', async () => {
    const { error } = await client.auth.signInWithOAuth({ provider: 'discord', options: { redirectTo: cleanUrl() } });
    if (error) message.textContent = `Sign-in failed: ${error.message}`;
  });
  client.auth.onAuthStateChange((_event, session) => showUser(session?.user));
  const { data } = await client.auth.getSession();
  await showUser(data.session?.user);
  await loadReviews();
});
