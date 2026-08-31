document.addEventListener('DOMContentLoaded', async () => {
  const root = document.querySelector('[data-extension-slug]');
  if (!root || !window.supabase) return;
  const list = root.querySelector('[data-review-list]');
  const summary = root.querySelector('[data-review-summary]');
  const state = root.querySelector('[data-review-form-state]');
  const signin = root.querySelector('[data-review-signin]');
  const form = root.querySelector('[data-review-form]');
  const starsInput = form?.querySelector('[name="rating"]');
  const stars = [...root.querySelectorAll('.review-star')];
  const message = root.querySelector('[data-review-message]');
  const client = await new Promise(resolve => {
    if (window.rtsSupabase) return resolve(window.rtsSupabase);
    window.addEventListener('rts-auth-state', () => resolve(window.rtsSupabase), { once: true });
  });
  if (!client) return;
  const escape = value => String(value ?? '').replace(/[&<>\'\"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[c]));
  const cleanLegacyName = value => String(value || '').split('#')[0].trim();
  const starText = rating => '★'.repeat(Number(rating)) + '☆'.repeat(5 - Number(rating));
  const displayName = (user, profile) => {
    const metadata = user?.user_metadata || {};
    const discord = user?.identities?.find(identity => identity.provider === 'discord')?.identity_data || {};
    const globalName = discord.global_name || metadata.global_name;
    const fallbackName = discord.name || metadata.name || discord.username || metadata.user_name || metadata.full_name || profile?.display_name;
    return globalName || cleanLegacyName(fallbackName) || 'RTS user';
  };
  const { data: extension, error: extensionError } = await client.from('extensions').select('id').eq('slug', root.dataset.extensionSlug).single();
  if (extensionError) { list.innerHTML = '<p class="reviews-empty">Reviews are temporarily unavailable.</p>'; return; }
  const setRating = rating => {
    const value = Number(rating);
    starsInput.value = value || '';
    stars.forEach(star => {
      const selected = Number(star.dataset.rating) <= value;
      star.classList.toggle('is-selected', selected);
      star.setAttribute('aria-checked', String(Number(star.dataset.rating) === value));
    });
  };
  stars.forEach(star => star.addEventListener('click', () => setRating(star.dataset.rating)));
  const loadReviews = async () => {
    const { data, error } = await client.from('reviews').select('id,user_id,rating,body,created_at,status,profiles(display_name,avatar_url)').eq('extension_id', extension.id).eq('status', 'published').order('created_at', { ascending: false });
    if (error) { list.innerHTML = '<p class="reviews-empty">Reviews are temporarily unavailable.</p>'; return; }
    const average = data.length ? data.reduce((sum, r) => sum + Number(r.rating), 0) / data.length : 0;
    const rounded = Math.round(average);
    summary.innerHTML = data.length
      ? `<span class="reviews-summary__stars" aria-label="Average rating ${average.toFixed(1)} out of 5">${'★'.repeat(rounded)}${'☆'.repeat(5 - rounded)}</span><span class="reviews-summary__count">${data.length} review${data.length === 1 ? '' : 's'}</span>`
      : 'No reviews yet';
    list.innerHTML = data.length ? data.map(review => `<article class="review-card"><div class="review-card__top"><strong>${escape(cleanLegacyName(review.profiles?.display_name || 'RTS user'))}</strong><span>${starText(review.rating)}</span></div><p>${escape(review.body)}</p></article>`).join('') : '<p class="reviews-empty">Be the first to review this extension.</p>';
  };
  const showUser = async user => {
    if (!user) {
      state.textContent = 'Sign in with Discord to leave a review.';
      signin.hidden = false;
      form.hidden = true;
      return;
    }
    signin.hidden = true;
    const { data: profile } = await client.from('profiles').select('display_name, avatar_url').eq('id', user.id).maybeSingle();
    const name = displayName(user, profile);
    const avatarUrl = profile?.avatar_url || user.user_metadata?.avatar_url || '';
    state.innerHTML = `<span class="review-signed-in"><img src="${escape(avatarUrl)}" alt=""><span>Signed in as <strong>${escape(name)}</strong></span></span>`;
    const { data: own } = await client.from('reviews').select('id,rating,body,status').eq('extension_id', extension.id).eq('user_id', user.id).maybeSingle();
    form.hidden = false;
    if (own) {
      setRating(own.rating);
      form.body.value = own.body || '';
      form.querySelector('button[type="submit"]').textContent = 'Update review';
    }
    form.onsubmit = async event => {
      event.preventDefault(); message.textContent = 'Saving…';
      const values = Object.fromEntries(new FormData(form));
      const payload = { extension_id: extension.id, user_id: user.id, rating: Number(values.rating), body: values.body.trim(), status: 'hidden' };
      if (!payload.rating || payload.rating < 1 || payload.rating > 5) { message.textContent = 'Please select a rating.'; return; }
      const result = own ? await client.from('reviews').update(payload).eq('id', own.id).eq('user_id', user.id) : await client.from('reviews').insert(payload);
      message.textContent = result.error ? `Could not save review: ${result.error.message}` : 'Review submitted for moderation.';
      if (!result.error) await loadReviews();
    };
  };
  signin.addEventListener('click', async () => {
    sessionStorage.setItem('rts-review-return', '1');
    const redirectTo = `${window.location.origin}${window.location.pathname}${window.location.search}`;
    const { error } = await client.auth.signInWithOAuth({ provider: 'discord', options: { redirectTo } });
    if (error) message.textContent = `Sign-in failed: ${error.message}`;
  });
  client.auth.onAuthStateChange((_event, session) => showUser(session?.user));
  const { data } = await client.auth.getSession();
  await showUser(data.session?.user);
  await loadReviews();
  if (data.session?.user && sessionStorage.getItem('rts-review-return')) {
    sessionStorage.removeItem('rts-review-return');
    document.getElementById('reviews')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
});
