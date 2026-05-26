const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

module.exports = async function handler(req, res) {
  const { slug } = req.query;

  const { data: session, error } = await supabase
    .from('sessions')
    .select(`
      id,
      title,
      session_type,
      start_time,
      end_time,
      location_name,
      address_text,
      current_player_count,
      max_players,
      skill_levels,
      description,
      share_slug,
      status,
      price_pence,
      cost_per_player_pence,
      coach_id,
      is_paid
    `)
    .eq('share_slug', slug)
    .single();

  if (error || !session) {
    return res.status(404).send(renderPage(null, null));
  }

  let coach = null;
  if (session.coach_id) {
    const { data: coachData } = await supabase
      .from('profiles')
      .select(`
        full_name,
        avatar_url,
        coach_bio,
        coach_rating,
        coach_rating_count,
        coach_specialities,
        coach_license,
        instagram_handle
      `)
      .eq('id', session.coach_id)
      .single();
    coach = coachData;
  }

  return res.status(200).send(renderPage(session, coach));
};

function formatDate(dateStr) {
  if (!dateStr) return 'TBC';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/London'
  });
}

function formatTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/London'
  });
}

function formatPrice(pence) {
  if (!pence) return null;
  return '£' + (pence / 100).toFixed(2);
}

function renderStars(rating) {
  if (!rating) return '';
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5 ? 1 : 0;
  const empty = 5 - full - half;
  return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(empty);
}

function renderPage(session, coach) {
  if (!session) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Session Not Found — BALLR</title>
  <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;900&family=Barlow:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #060a06;
      color: #fff;
      font-family: 'Barlow', sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 24px;
    }
    .icon { font-size: 64px; margin-bottom: 16px; }
    h1 { font-family: 'Barlow Condensed', sans-serif; font-size: 36px; font-weight: 900; margin-bottom: 12px; }
    p { color: #888; font-size: 16px; margin-bottom: 32px; }
    .btn {
      display: inline-block;
      background: #1db954;
      color: #000;
      font-family: 'Barlow Condensed', sans-serif;
      font-weight: 700;
      font-size: 18px;
      padding: 16px 32px;
      border-radius: 50px;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div>
    <div class="icon">⚽</div>
    <h1>Session Not Found</h1>
    <p>This session may have ended or been removed.</p>
    <a href="https://testflight.apple.com/join/dwbq9ST7" class="btn">Download BALLR</a>
  </div>
</body>
</html>`;
  }

  const spotsLeft = session.max_players - session.current_player_count;
  const isFull = spotsLeft <= 0;
  const sessionDate = formatDate(session.start_time);
  const startTime = formatTime(session.start_time);
  const endTime = session.end_time ? formatTime(session.end_time) : null;
  const timeStr = endTime ? `${startTime} — ${endTime}` : startTime;
  const deepLink = `ballr://session/${session.share_slug}`;
  const pricePerPlayer = formatPrice(session.cost_per_player_pence || session.price_pence);
  const isPaid = session.is_paid && pricePerPlayer;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${session.title || 'Football Session'} — BALLR</title>
  <meta property="og:title" content="${session.title || 'Football Session'} — BALLR" />
  <meta property="og:description" content="${isPaid ? pricePerPlayer + ' per player · ' : ''}${sessionDate} at ${session.location_name || session.address_text || 'TBC'}" />
  <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,700;0,900;1,900&family=Barlow:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #060a06;
      color: #fff;
      font-family: 'Barlow', sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px;
      position: relative;
      overflow: hidden;
    }
    body::before {
      content: '';
      position: fixed;
      top: -50%;
      left: -50%;
      width: 200%;
      height: 200%;
      background: radial-gradient(ellipse at 60% 20%, rgba(29,185,84,0.12) 0%, transparent 60%),
                  radial-gradient(ellipse at 20% 80%, rgba(29,185,84,0.06) 0%, transparent 50%);
      pointer-events: none;
    }
    .card {
      width: 100%;
      max-width: 420px;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 24px;
      overflow: hidden;
      position: relative;
      z-index: 1;
      animation: fadeUp 0.4s ease forwards;
    }
    .card-header {
      background: linear-gradient(135deg, #1a2e1a 0%, #0d1a0d 100%);
      padding: 32px 28px 24px;
      border-bottom: 1px solid rgba(29,185,84,0.2);
    }
    .logo {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 20px;
    }
    .logo-icon {
      width: 32px;
      height: 32px;
      background: #1db954;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
    }
    .logo-text {
      font-family: 'Barlow Condensed', sans-serif;
      font-weight: 900;
      font-size: 20px;
      letter-spacing: 1px;
      color: #fff;
    }
    .badges {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-bottom: 12px;
    }
    .badge {
      display: inline-block;
      background: rgba(29,185,84,0.15);
      border: 1px solid rgba(29,185,84,0.3);
      color: #1db954;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      padding: 4px 12px;
      border-radius: 50px;
    }
    .badge-price {
      background: rgba(255,215,0,0.15);
      border: 1px solid rgba(255,215,0,0.3);
      color: #ffd700;
      font-size: 13px;
      letter-spacing: 0.5px;
      font-weight: 700;
    }
    .session-title {
      font-family: 'Barlow Condensed', sans-serif;
      font-weight: 900;
      font-size: 38px;
      line-height: 1.0;
      letter-spacing: -0.5px;
    }
    .card-body { padding: 24px 28px; }
    .detail-row {
      display: flex;
      align-items: flex-start;
      gap: 14px;
      padding: 14px 0;
      border-bottom: 1px solid rgba(255,255,255,0.06);
    }
    .detail-row:last-of-type { border-bottom: none; }
    .detail-icon {
      width: 36px;
      height: 36px;
      background: rgba(29,185,84,0.1);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      flex-shrink: 0;
      margin-top: 2px;
    }
    .detail-label {
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 1px;
      text-transform: uppercase;
      color: #555;
      margin-bottom: 3px;
    }
    .detail-value {
      font-size: 16px;
      font-weight: 500;
      color: #fff;
      line-height: 1.4;
    }
    .detail-value.price {
      font-family: 'Barlow Condensed', sans-serif;
      font-size: 28px;
      font-weight: 900;
      color: #ffd700;
    }
    .spots-bar {
      margin-top: 6px;
      height: 4px;
      background: rgba(255,255,255,0.1);
      border-radius: 2px;
      overflow: hidden;
    }
    .spots-fill {
      height: 100%;
      background: #1db954;
      border-radius: 2px;
      width: ${Math.min(100, (session.current_player_count / session.max_players) * 100)}%;
    }
    .spots-text {
      font-size: 13px;
      color: ${isFull ? '#ff4444' : '#1db954'};
      font-weight: 600;
      margin-top: 4px;
    }
    .coach-card {
      margin: 0 28px 20px;
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 16px;
      padding: 16px;
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .coach-avatar {
      width: 52px;
      height: 52px;
      border-radius: 50%;
      background: #1db954;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'Barlow Condensed', sans-serif;
      font-weight: 900;
      font-size: 22px;
      color: #000;
      flex-shrink: 0;
      overflow: hidden;
    }
    .coach-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .coach-info { flex: 1; min-width: 0; }
    .coach-label {
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      color: #1db954;
      margin-bottom: 2px;
    }
    .coach-name {
      font-family: 'Barlow Condensed', sans-serif;
      font-weight: 700;
      font-size: 18px;
      color: #fff;
      margin-bottom: 2px;
    }
    .coach-rating {
      font-size: 13px;
      color: #ffd700;
    }
    .coach-rating span {
      color: #666;
      font-size: 11px;
      margin-left: 4px;
    }
    .coach-bio {
      font-size: 13px;
      color: #888;
      margin-top: 4px;
      line-height: 1.4;
      overflow: hidden;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }
    .card-footer {
      padding: 20px 28px 28px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .btn-primary {
      display: block;
      background: #1db954;
      color: #000;
      font-family: 'Barlow Condensed', sans-serif;
      font-weight: 700;
      font-size: 20px;
      letter-spacing: 0.5px;
      text-align: center;
      padding: 18px;
      border-radius: 14px;
      text-decoration: none;
    }
    .btn-secondary {
      display: block;
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.1);
      color: #fff;
      font-family: 'Barlow Condensed', sans-serif;
      font-weight: 700;
      font-size: 18px;
      letter-spacing: 0.5px;
      text-align: center;
      padding: 16px;
      border-radius: 14px;
      text-decoration: none;
    }
    .footer-note {
      text-align: center;
      font-size: 12px;
      color: #444;
      margin-top: 4px;
    }
    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="card-header">
      <div class="logo">
        <div class="logo-icon">⚽</div>
        <span class="logo-text">BALLR</span>
      </div>
      <div class="badges">
        ${session.session_type ? `<span class="badge">${session.session_type}</span>` : ''}
        ${isPaid ? `<span class="badge badge-price">${pricePerPlayer} per player</span>` : ''}
      </div>
      <h1 class="session-title">${session.title || 'Football Session'}</h1>
    </div>

    <div class="card-body">
      <div class="detail-row">
        <div class="detail-icon">📅</div>
        <div>
          <div class="detail-label">Date</div>
          <div class="detail-value">${sessionDate}</div>
        </div>
      </div>
      <div class="detail-row">
        <div class="detail-icon">⏰</div>
        <div>
          <div class="detail-label">Time</div>
          <div class="detail-value">${timeStr}</div>
        </div>
      </div>
      <div class="detail-row">
        <div class="detail-icon">📍</div>
        <div>
          <div class="detail-label">Location</div>
          <div class="detail-value">${session.location_name || session.address_text || 'Location TBC'}</div>
        </div>
      </div>
      <div class="detail-row">
        <div class="detail-icon">👥</div>
        <div>
          <div class="detail-label">Players</div>
          <div class="detail-value">${session.current_player_count} / ${session.max_players} joined</div>
          <div class="spots-bar"><div class="spots-fill"></div></div>
          <div class="spots-text">${isFull ? 'Session full' : `${spotsLeft} spot${spotsLeft === 1 ? '' : 's'} left`}</div>
        </div>
      </div>
      ${session.skill_levels && session.skill_levels.length > 0 ? `
      <div class="detail-row">
        <div class="detail-icon">⭐</div>
        <div>
          <div class="detail-label">Skill Level</div>
          <div class="detail-value">${session.skill_levels.join(', ')}</div>
        </div>
      </div>` : ''}
      ${session.description ? `
      <div class="detail-row">
        <div class="detail-icon">📋</div>
        <div>
          <div class="detail-label">Session Notes</div>
          <div class="detail-value">${session.description}</div>
        </div>
      </div>` : ''}
    </div>

    ${coach ? `
    <div class="coach-card">
      <div class="coach-avatar">
        ${coach.avatar_url ? `<img src="${coach.avatar_url}" alt="${coach.full_name}" />` : (coach.full_name ? coach.full_name[0].toUpperCase() : 'C')}
      </div>
      <div class="coach-info">
        <div class="coach-label">Your Coach</div>
        <div class="coach-name">${coach.full_name || 'Coach'}</div>
        ${coach.coach_rating ? `
        <div class="coach-rating">
          ${'★'.repeat(Math.floor(coach.coach_rating))}${'☆'.repeat(5 - Math.floor(coach.coach_rating))}
          <span>${coach.coach_rating.toFixed(1)} · ${coach.coach_rating_count || 0} reviews</span>
        </div>` : ''}
        ${coach.coach_bio ? `<div class="coach-bio">${coach.coach_bio}</div>` : ''}
      </div>
    </div>` : ''}

    <div class="card-footer">
      <a href="${deepLink}" class="btn-primary">⚡ ${isPaid ? `Book for ${pricePerPlayer}` : 'Open in BALLR'}</a>
      <a href="https://testflight.apple.com/join/dwbq9ST7" class="btn-secondary">Download BALLR</a>
      <p class="footer-note">Already have BALLR? Tap "${isPaid ? `Book for ${pricePerPlayer}` : 'Open in BALLR'}" above</p>
    </div>
  </div>
  <script>
    window.addEventListener('load', function() {
      window.location.href = '${deepLink}';
    });
  </script>
</body>
</html>`;
}
