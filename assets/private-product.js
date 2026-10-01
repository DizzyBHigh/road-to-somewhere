document.addEventListener('DOMContentLoaded', () => {
  const page = document.querySelector('[data-private-product]');
  if (!page || !window.supabase || !window.rtsSupabase) return;

  const status = page.querySelector('[data-private-product-status]');
  const content = document.querySelector('[data-private-product-content]');

  const show = (message, allowed) => {
    status.textContent = message;
    content.hidden = !allowed;
  };

  const checkAdmin = async () => {
    const user = window.rtsAuthSession?.user;
    if (!user) {
      show('Sign in with Discord to access this extension.', false);
      return;
    }

    const { data: admin, error } = await window.rtsSupabase
      .from('admin_users')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error || !admin) {
      show('You do not have administrator access.', false);
      return;
    }

    show('Administrator access confirmed.', true);
  };

  window.addEventListener('rts-auth-state', checkAdmin);
  checkAdmin();
});
