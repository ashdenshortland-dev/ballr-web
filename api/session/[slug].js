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
      is_paid,
      coach_session_type,
      skill_focus,
      age_groups,
      surface_type,
      is_recurring,
      recurrence_frequency,
      recurrence_count,
      series_id,
      series_index,
      block_booking_enabled,
      block_price,
      block_discount_percent,
      session_pricing_model
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
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/London'
  });
}

function formatTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' });
}

function formatPrice(pence) {
  if (!pence && pence !== 0) return null;
  return '£' + (pence / 100).toFixed(2);
}

function renderStars(rating) {
  if (!rating) return '';
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5 ? 1 : 0;
  const empty = 5 - full - half;
  return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(empty);
}

function formatCoachSessionType(type) {
  if (!type) return null;
  const map = { 'small_group': 'Small Group', 'large_group': 'Large Group', '1_to_1': '1-to-1', 'one_to_one': '1-to-1', 'team': 'Team Session', 'academy': 'Academy', 'camp': 'Camp' };
  return map[type] || type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function formatSurfaceType(type) {
  if (!type) return null;
  const map = { 'grass': 'Grass', 'astro': 'Astroturf', 'artificial': 'Artificial Turf', '3g': '3G', '4g': '4G', 'indoor': 'Indoor', 'futsal': 'Futsal' };
  return map[type] || type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function renderPage(session, coach) {
  const isCoach = session && session.session_type === 'coach';
  const accentColor = isCoach ? '#F97316' : '#39FF78';
  const accentDim = isCoach ? '#EA580C' : '#2ED769';
  const accentSoft = isCoach ? 'rgba(249,115,22,0.14)' : 'rgba(57,255,120,0.14)';
  const accentBorder = isCoach ? 'rgba(249,115,22,0.3)' : 'rgba(57,255,120,0.3)';
  const accentBg = isCoach ? 'rgba(249,115,22,0.08)' : 'rgba(57,255,120,0.08)';
  const ctaTextColor = isCoach ? '#fff' : '#000';

  if (!session) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Session Not Found - BALLR</title>
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;900&family=Barlow:wght@400;500;600&display=swap" rel="stylesheet">
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { background: #060a06; color: #fff; font-family: 'Barlow', sans-serif; min-height: 100vh; display: flex; align-items: center; justify-content: center; text-align: center; padding: 24px; }
.icon { font-size: 64px; margin-bottom: 16px; }
h1 { font-family: 'Barlow Condensed', sans-serif; font-size: 36px; font-weight: 900; margin-bottom: 12px; }
p { color: #888; font-size: 16px; margin-bottom: 32px; }
.btn { display: inline-block; background: #39FF78; color: #000; font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 18px; padding: 14px 32px; border-radius: 12px; text-decoration: none; }
</style>
</head>
<body>
<div>
  <div class="icon">⚽</div>
  <h1>Session Not Found</h1>
  <p>This session link may have expired or been removed.</p>
  <a href="https://apps.apple.com/app/ballr/id6744039091" class="btn">Get BALLR</a>
</div>
</body>
</html>`;
  }

  const isPaid = session.is_paid || (session.price_pence && session.price_pence > 0) || (session.cost_per_player_pence && session.cost_per_player_pence > 0);
  const sessionPrice = session.price_pence ? formatPrice(session.price_pence) : (session.cost_per_player_pence ? formatPrice(session.cost_per_player_pence) : null);
  const typeLabel = isCoach ? (formatCoachSessionType(session.coach_session_type) || 'Coach Session') : (session.session_type ? session.session_type.charAt(0).toUpperCase() + session.session_type.slice(1).replace(/_/g, ' ') : 'Session');
  const skillLevels = Array.isArray(session.skill_levels) ? session.skill_levels : (session.skill_levels ? [session.skill_levels] : []);
  const skillFocus = Array.isArray(session.skill_focus) ? session.skill_focus : (session.skill_focus ? [session.skill_focus] : []);
  const ageGroups = Array.isArray(session.age_groups) ? session.age_groups : (session.age_groups ? [session.age_groups] : []);
  const hasBlockBooking = session.block_booking_enabled && session.block_price;
  const blockPrice = hasBlockBooking ? formatPrice(session.block_price) : null;
  const blockDiscount = session.block_discount_percent ? Math.round(session.block_discount_percent) : null;
  const isRecurring = session.is_recurring;
  const recurrenceLabel = isRecurring && session.recurrence_frequency ? (session.recurrence_count ? session.recurrence_count + 'x ' + session.recurrence_frequency : session.recurrence_frequency.charAt(0).toUpperCase() + session.recurrence_frequency.slice(1)) : null;
  const surfaceLabel = formatSurfaceType(session.surface_type);
  const spotsLeft = Math.max(0, (session.max_players || 0) - (session.current_player_count || 0));
  const fillPct = session.max_players ? Math.min(100, Math.round(((session.current_player_count || 0) / session.max_players) * 100)) : 0;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${session.title || typeLabel} - BALLR</title>
<meta name="description" content="${session.description || (isCoach ? 'Book this coaching session on BALLR' : 'Join this session on BALLR')}">
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;900&family=Barlow:wght@400;500;600&display=swap" rel="stylesheet">
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { background: #050505; color: #fff; font-family: 'Barlow', sans-serif; min-height: 100vh; padding-bottom: 110px; }
.hero { background: linear-gradient(180deg, ${accentBg} 0%, #050505 100%); border-bottom: 1px solid ${accentBorder}; padding: 32px 20px 28px; text-align: center; }
.badge { display: inline-flex; align-items: center; gap: 6px; background: ${accentSoft}; border: 1px solid ${accentBorder}; color: ${accentColor}; font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 13px; letter-spacing: 1px; text-transform: uppercase; padding: 5px 12px; border-radius: 20px; margin-bottom: 14px; }
.title { font-family: 'Barlow Condensed', sans-serif; font-size: clamp(28px,7vw,42px); font-weight: 900; line-height: 1.05; }
.subtitle { color: #9A9DAC; font-size: 14px; margin-top: 8px; }
.content { max-width: 480px; margin: 0 auto; padding: 0 16px; }
.card { margin-top: 16px; background: #141414; border-radius: 16px; border: 1px solid rgba(255,255,255,0.07); overflow: hidden; }
.card-title { font-family: 'Barlow Condensed', sans-serif; font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: #5A5D6E; padding: 12px 16px 8px; border-bottom: 1px solid rgba(255,255,255,0.05); }
.row { display: flex; align-items: flex-start; gap: 12px; padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.04); }
.row:last-child { border-bottom: none; }
.icon { font-size: 18px; width: 24px; text-align: center; flex-shrink: 0; margin-top: 1px; }
.label { font-size: 11px; color: #5A5D6E; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px; }
.value { font-size: 15px; color: #F0F1F5; font-weight: 500; line-height: 1.4; }
.value.hi { color: ${accentColor}; font-weight: 700; }
.tags { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 4px; }
.tag { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); color: #C8CAD4; font-size: 12px; font-weight: 600; padding: 3px 9px; border-radius: 7px; }
.tag.hi { background: ${accentSoft}; border-color: ${accentBorder}; color: ${accentColor}; }
.price-wrap { padding: 14px 16px; border-bottom: 1px solid rgba(255,255,255,0.04); }
.price-amt { font-family: 'Barlow Condensed', sans-serif; font-size: 34px; font-weight: 900; color: ${accentColor}; }
.price-note { font-size: 13px; color: #5A5D6E; margin-top: 2px; }
.block-row { display: flex; align-items: center; gap: 8px; margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.05); }
.block-amt { font-family: 'Barlow Condensed', sans-serif; font-size: 22px; font-weight: 800; color: ${accentColor}; }
.save-badge { background: ${accentSoft}; border: 1px solid ${accentBorder}; color: ${accentColor}; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 6px; }
.spots-wrap { padding: 12px 16px; }
.spots-head { display: flex; justify-content: space-between; font-size: 12px; color: #5A5D6E; margin-bottom: 7px; }
.spots-head b { color: #C8CAD4; }
.bar { height: 5px; background: rgba(255,255,255,0.07); border-radius: 3px; overflow: hidden; }
.bar-fill { height: 100%; background: ${accentColor}; border-radius: 3px; }
.coach-wrap { display: flex; align-items: center; gap: 14px; padding: 14px 16px; }
.avatar { width: 52px; height: 52px; border-radius: 50%; object-fit: cover; border: 2px solid ${accentBorder}; background: #222; flex-shrink: 0; }
.avatar-ph { width: 52px; height: 52px; border-radius: 50%; background: ${accentSoft}; border: 2px solid ${accentBorder}; display: flex; align-items: center; justify-content: center; font-size: 22px; flex-shrink: 0; }
.coach-name { font-family: 'Barlow Condensed', sans-serif; font-size: 18px; font-weight: 800; }
.coach-sub { font-size: 13px; color: #6B6F7E; margin-top: 2px; }
.stars { color: #F59E0B; font-size: 13px; font-weight: 600; }
.bio { padding: 0 16px 14px; font-size: 14px; color: #9A9DAC; line-height: 1.6; }
.spec-wrap { padding: 0 16px 14px; }
.recur-pill { display: inline-flex; align-items: center; gap: 4px; background: rgba(99,102,241,0.12); border: 1px solid rgba(99,102,241,0.25); color: #818CF8; font-size: 12px; font-weight: 600; padding: 3px 10px; border-radius: 6px; margin-top: 4px; }
.cta-bar { position: fixed; bottom: 0; left: 0; right: 0; padding: 16px 20px; padding-top: 28px; background: linear-gradient(to bottom, transparent, #050505 50%); }
.cta { display: block; width: 100%; max-width: 480px; margin: 0 auto; background: ${accentColor}; color: ${ctaTextColor}; font-family: 'Barlow Condensed', sans-serif; font-weight: 900; font-size: 20px; letter-spacing: 0.5px; text-align: center; padding: 16px; border-radius: 14px; text-decoration: none; }
</style>
</head>
<body>
<div class="hero">
  <div class="badge">${isCoach ? '🏆 Coaching Session' : '⚽ ' + typeLabel}</div>
  <div class="title">${session.title || typeLabel}</div>
  ${session.description ? '<div class="subtitle">' + session.description.substring(0,90) + (session.description.length > 90 ? '...' : '') + '</div>' : ''}
</div>
<div class="content">

  <div class="card">
    <div class="card-title">When &amp; Where</div>
    ${session.start_time ? '<div class="row"><div class="icon">📅</div><div><div class="label">Date</div><div class="value">' + formatDate(session.start_time) + '</div></div></div>' : ''}
    ${session.start_time ? '<div class="row"><div class="icon">⏰</div><div><div class="label">Time</div><div class="value">' + formatTime(session.start_time) + (session.end_time ? ' – ' + formatTime(session.end_time) : '') + (isRecurring && recurrenceLabel ? '<div class="recur-pill">🔁 ' + recurrenceLabel + '</div>' : '') + '</div></div></div>' : ''}
    ${(session.location_name || session.address_text) ? '<div class="row"><div class="icon">📍</div><div><div class="label">Location</div><div class="value">' + (session.location_name || '') + (session.location_name && session.address_text ? '<br><span style="color:#6B6F7E;font-size:13px;">' + session.address_text + '</span>' : (session.address_text || '')) + '</div></div></div>' : ''}
    ${surfaceLabel ? '<div class="row"><div class="icon">🟩</div><div><div class="label">Surface</div><div class="value">' + surfaceLabel + '</div></div></div>' : ''}
  </div>

  <div class="card">
    <div class="card-title">Session Details</div>
    ${isCoach && session.coach_session_type ? '<div class="row"><div class="icon">📋</div><div><div class="label">Format</div><div class="value hi">' + formatCoachSessionType(session.coach_session_type) + '</div></div></div>' : ''}
    ${ageGroups.length > 0 ? '<div class="row"><div class="icon">👶</div><div><div class="label">Age Groups</div><div class="tags">' + ageGroups.map(a => '<span class="tag hi">' + a + '</span>').join('') + '</div></div></div>' : ''}
    ${skillLevels.length > 0 ? '<div class="row"><div class="icon">💪</div><div><div class="label">Skill Level</div><div class="tags">' + skillLevels.map(s => '<span class="tag">' + s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g,' ') + '</span>').join('') + '</div></div></div>' : ''}
    ${skillFocus.length > 0 ? '<div class="row"><div class="icon">🎯</div><div><div class="label">Skill Focus</div><div class="tags">' + skillFocus.map(s => '<span class="tag">' + s + '</span>').join('') + '</div></div></div>' : ''}
    ${session.max_players ? '<div class="spots-wrap"><div class="label" style="margin-bottom:7px;">👥 Spots</div><div class="spots-head"><span>' + (session.current_player_count||0) + ' joined</span><b>' + spotsLeft + ' left of ' + session.max_players + '</b></div><div class="bar"><div class="bar-fill" style="width:' + fillPct + '%"></div></div></div>' : ''}
    ${!isCoach && session.description ? '<div class="row"><div class="icon">💬</div><div><div class="label">About</div><div class="value" style="font-size:14px;color:#9A9DAC;">' + session.description + '</div></div></div>' : ''}
  </div>

  ${isPaid || hasBlockBooking ? '<div class="card"><div class="card-title">Pricing</div><div class="price-wrap"><div class="price-amt">' + (sessionPrice || 'See app') + '</div><div class="price-note">per ' + (isCoach ? 'session' : 'player') + '</div>' + (hasBlockBooking ? '<div class="block-row"><div><div class="label" style="margin-bottom:3px;">Block Booking</div><div class="block-amt">' + blockPrice + '</div><div style="font-size:12px;color:#9A9DAC;">' + (session.recurrence_count||'multiple') + ' sessions</div></div>' + (blockDiscount ? '<div class="save-badge">SAVE ' + blockDiscount + '%</div>' : '') + '</div>' : '') + '</div></div>' : ''}

  ${isCoach && session.description ? '<div class="card"><div class="card-title">About This Session</div><div class="row"><div class="icon">💬</div><div class="value" style="font-size:14px;color:#9A9DAC;line-height:1.6;">' + session.description + '</div></div></div>' : ''}

  ${coach ? '<div class="card"><div class="card-title">Your Coach</div><div class="coach-wrap">' + (coach.avatar_url ? '<img class="avatar" src="' + coach.avatar_url + '" alt="' + (coach.full_name||'Coach') + '">' : '<div class="avatar-ph">🏆</div>') + '<div><div class="coach-name">' + (coach.full_name||'Coach') + '</div>' + (coach.coach_rating ? '<div class="stars">' + renderStars(coach.coach_rating) + ' ' + coach.coach_rating.toFixed(1) + (coach.coach_rating_count ? ' <span style="color:#6B6F7E;font-size:12px;">(' + coach.coach_rating_count + ' reviews)</span>' : '') + '</div>' : '') + (coach.coach_license ? '<div class="coach-sub">📋 ' + coach.coach_license + '</div>' : '') + (coach.instagram_handle ? '<div class="coach-sub">📷 @' + coach.instagram_handle + '</div>' : '') + '</div></div>' + (coach.coach_bio ? '<div class="bio">' + coach.coach_bio + '</div>' : '') + (coach.coach_specialities && coach.coach_specialities.length > 0 ? '<div class="spec-wrap"><div class="label" style="margin-bottom:6px;">Specialities</div><div class="tags">' + (Array.isArray(coach.coach_specialities)?coach.coach_specialities:[coach.coach_specialities]).map(s=>'<span class="tag hi">'+s+'</span>').join('') + '</div></div>' : '') + '</div>' : ''}

</div>
<div class="cta-bar">
  <a href="https://apps.apple.com/app/ballr/id6744039091" class="cta">${isCoach ? 'Book on BALLR' : 'Join on BALLR'}</a>
</div>
</body>
</html>`;
}
