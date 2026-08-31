document.addEventListener('DOMContentLoaded', async () => {
  const root = document.querySelector('[data-admin-page]');
  if (!root || !window.supabase) return;
  const status = root.querySelector('[data-admin-status]');
  const list = root.querySelector('[data-admin-reviews]');
  const client = await new Promise(resolve => {
    if (window.rtsSupabase) return resolve(window.rtsSupabase);
    window.addEventListener('rts-auth-state', () => resolve(window.rtsSupabase), { once: true });
  });
  if (!client) return;

  const escape = value => String(value ?? '').replace(/[&<>\'\"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[c]));
  const stars = rating => '★'.repeat(Number(rating)) + '☆'.repeat(5 - Number(rating));

  const checkAdmin = async user => {
    if (!user) return false;
    const { data } = await client.from('admin_users').select('user_id').eq('user_id', user.id).maybeSingle();
    return Boolean(data);
  };

  const loadReviews = async () => {
    const { data, error } = await client.from('reviews')
      .select('id,rating,body,status,created_at,profiles(display_name,avatar_url),extensions(name,slug)')
      .order('created_at', { ascending: true });
    if (error) {
      status.textContent = `Could not load reviews: ${error.message}`;
      return;
    }
    if (!data.length) {
      list.innerHTML = '<p class="admin-empty">There are no reviews to moderate.</p>';
      return;
    }
    list.innerHTML = data.map(review => {
      const profile = review.profiles || {};
      const extension = review.extensions || {};
      const name = profile.display_name || 'Unknown user';
      const avatar = profile.avatar_url || '';
      return `<article class="admin-review" data-review-id="${escape(review.id)}">
        <div class="admin-review__top">
          <div class="admin-review__author">${avatar ? `<img src="${escape(avatar)}" alt="">` : ''}<strong>${escape(name)}</strong></div>
          <span class="admin-review__rating" aria-label="${review.rating} out of 5">${stars(review.rating)}</span>
        </div>
        <div class="admin-review__meta">${escape(extension.name || extension.slug || 'Unknown extension')} · ${escape(review.status)} · ${new Date(review.created_at).toLocaleString()}</div>
        <p class="admin-review__body">${escape(review.body)}</p>
        <div class="admin-review__actions">${review.status !== 'published' ? '<button class="button button--blue" data-status="published">Publish</button>' : '<button class="button button--blue" data-status="hidden">Hide</button>'}<button class="button is-danger" data-status="deleted">Delete</button></div>
      </article>`;
    }).join('');
  };

  const { data } = await client.auth.getSession();
  if (!(await checkAdmin(data.session?.user))) {
    status.textContent = data.session?.user ? 'You do not have administrator access.' : 'Sign in with Discord to continue.';
    return;
  }

  status.textContent = 'Administrator access confirmed.';
  await loadReviews();
  list.addEventListener('click', async event => {
    const button = event.target.closest('[data-status]');
    const card = event.target.closest('[data-review-id]');
    if (!button || !card) return;
    button.disabled = true;
    const nextStatus = button.dataset.status;
    const { error } = await client.from('reviews').update({ status: nextStatus }).eq('id', card.dataset.reviewId);
    if (error) status.textContent = `Could not update review: ${error.message}`;
    else await loadReviews();
  });
});
