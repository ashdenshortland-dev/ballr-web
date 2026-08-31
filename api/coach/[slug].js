const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

module.exports = async function handler(req, res) {
    const { slug } = req.query;

    // slug can be a username or a UUID (id)
    let coach = null;

    // Try by username first
    const { data: byUsername } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', slug)
        .single();

    if (byUsername) {
        coach = byUsername;
    } else {
        // Try by UUID
        const { data: byId } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', slug)
            .single();

        if (byId) {
            coach = byId;
        }
    }

    if (!coach) {
        return res.status(404).send(renderPage(null, [], []));
    }

    // Fetch top 3 reviews for this coach
    let reviews = [];
    if (coach.id) {
        const { data: reviewData } = await supabase
            .from('reviews')
            .select('rating, comment, reviewer_name, created_at')
            .eq('coach_id', coach.id)
            .order('rating', { ascending: false })
            .limit(3);
        if (reviewData && reviewData.length > 0) {
            reviews = reviewData;
        }
    }

    // Fetch the next 3 upcoming sessions this coach is running.
    // Private (invite-only) sessions are excluded since this is a public page.
    // Uses select('*') rather than naming columns, since we don't know the
    // exact sessions schema here (see api/session/[slug].js for the same
    // pattern) — naming a column that doesn't exist would fail the whole
    // query. The is_private filter is applied in JS for the same reason.
    let upcomingSessions = [];
    if (coach.id) {
        const nowIso = new Date().toISOString();
        const { data: sessionData, error: sessionError } = await supabase
            .from('sessions')
            .select('*')
            .eq('coach_id', coach.id)
            .gte('start_time', nowIso)
            .order('start_time', { ascending: true })
            .limit(10);
        if (sessionError) {
            console.error('Failed to fetch upcoming sessions for coach', coach.id, sessionError);
        } else if (sessionData && sessionData.length > 0) {
            upcomingSessions = sessionData.filter(function(s) { return !s.is_private; }).slice(0, 3);
        }
    }

    return res.status(200).send(renderPage(coach, reviews, upcomingSessions));
};

function renderStars(rating) {
    if (!rating) return '';
    var full = Math.floor(rating);
    var half = rating % 1 >= 0.5 ? 1 : 0;
    var empty = 5 - full - half;
    var stars = '';
    for (var i = 0; i < full; i++) stars += '\u2605';
    if (half) stars += '\u00BD';
    for (var j = 0; j < empty; j++) stars += '\u2606';
    return stars;
}

function formatSessionDate(dateStr) {
    if (!dateStr) return 'Date TBC';
    var d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', {
        weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Europe/London'
    });
}

function formatSessionTime(dateStr) {
    if (!dateStr) return '';
    var d = new Date(dateStr);
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' });
}

function formatSessionPrice(pence) {
    if (!pence && pence !== 0) return null;
    return '\u00a3' + (pence / 100).toFixed(2);
}

function titleCase(str) {
    return str.replace(/_/g, ' ').replace(/\b\w/g, function(c) { return c.toUpperCase(); });
}

function formatCoachSessionType(type) {
    if (!type) return null;
    var map = { 'small_group': 'Small Group', 'large_group': 'Large Group', '1_to_1': '1-to-1', 'one_to_one': '1-to-1', 'team': 'Team Session', 'individual': 'Individual' };
    return map[type] || titleCase(type);
}

function renderPage(coach, reviews, upcomingSessions) {
    var appScheme = coach
        ? (coach.username
            ? 'ballr://coach/' + coach.username
            : 'ballr://coach/id/' + coach.id)
        : 'ballr://';

    var coachName = coach ? (coach.full_name || coach.username || 'Coach') : 'Coach Not Found';
    var coachBio = coach ? (coach.coach_bio || '') : '';
    var coachRating = coach ? (coach.coach_rating || 0) : 0;
    var coachRatingCount = coach ? (coach.coach_rating_count || 0) : 0;
    var coachSpecialities = coach ? (coach.coach_specialities || []) : [];
    var coachLicense = coach ? (coach.coach_license || coach.qualifications || coach.coach_qualifications || coach.certifications || '') : '';
    var coachLocation = coach ? (coach.location || '') : '';
    var coachBookingLocations = coach ? (coach.direct_booking_locations || []) : [];
    var avatarUrl = coach ? (coach.avatar_url || '') : '';

    var accentColor = 'rgba(249,115,22,1)';
    var accentBg = 'rgba(249,115,22,0.15)';
    var accentBorder = 'rgba(249,115,22,0.3)';

    var specialtiesHtml = Array.isArray(coachSpecialities) && coachSpecialities.length > 0
        ? '<div class="specialties">' +
            coachSpecialities.map(function(s) { return '<span class="tag">' + escapeHtml(s) + '</span>'; }).join('') +
            '</div>'
        : '';

    var ratingHtml = coachRating > 0
        ? '<div class="rating-row">' +
            '<span class="stars-display">' + renderStars(coachRating) + '</span>' +
            '<span class="rating-number">' + coachRating.toFixed(1) + '</span>' +
            '<span class="rating-count">(' + coachRatingCount + ' review' + (coachRatingCount !== 1 ? 's' : '') + ')</span>' +
            '</div>'
        : '';

    var avatarHtml = avatarUrl
        ? '<img class="avatar" src="' + escapeHtml(avatarUrl) + '" alt="' + escapeHtml(coachName) + '" />'
        : '<div class="avatar avatar-placeholder">' + escapeHtml(coachName.charAt(0).toUpperCase()) + '</div>';

    var bioHtml = coachBio
        ? '<p class="bio">' + escapeHtml(coachBio) + '</p>'
        : '';

    var locationHtml = '';
    if (Array.isArray(coachBookingLocations) && coachBookingLocations.length > 0) {
        var locationNames = coachBookingLocations
            .map(function(loc) { return loc && loc.name ? escapeHtml(loc.name) : null; })
            .filter(Boolean);
        if (locationNames.length > 0) {
            locationHtml = '<div class="location">\u{1F4CD} ' + locationNames.join(' &middot; ') + '</div>';
        }
    }

    var qualificationHtml = coachLicense
        ? '<div class="qualification"><span class="qualification-label">\u{1F3C5} Qualification: </span>' + escapeHtml(coachLicense) + '</div>'
        : '';

    var sessionsHtml = '';
    if (upcomingSessions && upcomingSessions.length > 0) {
        sessionsHtml = '<div class="sessions-section">' +
            '<h3 class="sessions-title">Upcoming Sessions</h3>' +
            upcomingSessions.map(function(s) {
                var typeLabel = formatCoachSessionType(s.coach_session_type) ||
                    (s.session_type ? titleCase(s.session_type) : 'Coaching Session');
                var sessionTitle = s.title ? escapeHtml(s.title) : typeLabel;
                var dateLabel = formatSessionDate(s.start_time);
                var timeLabel = formatSessionTime(s.start_time);
                var locationText = s.location_name || s.address_text || '';
                var surfaceLabel = s.surface_type ? titleCase(s.surface_type) : '';
                var pricePence = (s.price_pence || s.price_pence === 0) ? s.price_pence : s.cost_per_player_pence;
                var priceLabel = (pricePence || pricePence === 0) ? formatSessionPrice(pricePence) : 'Free';

                var spotsHtml = '';
                if (s.max_players) {
                    var spotsLeft = Math.max(0, s.max_players - (s.current_player_count || 0));
                    var spotsText = spotsLeft === 0 ? 'Full' : (spotsLeft + ' spot' + (spotsLeft !== 1 ? 's' : '') + ' left');
                    spotsHtml = '<span class="session-spots' + (spotsLeft === 0 ? ' session-spots-full' : '') + '">' + spotsText + '</span>';
                }

                var metaHtml = '<div class="session-meta">' +
                    '<span class="session-meta-item">\u{1F4C5} ' + escapeHtml(dateLabel) + '</span>' +
                    (timeLabel ? '<span class="session-meta-item">\u{1F550} ' + escapeHtml(timeLabel) + '</span>' : '') +
                    '</div>';

                var locationHtmlInner = locationText
                    ? '<div class="session-location">\u{1F4CD} ' + escapeHtml(locationText) + (surfaceLabel ? ' &middot; ' + escapeHtml(surfaceLabel) : '') + '</div>'
                    : '';

                var bookBtnHtml = s.share_slug
                    ? '<a class="session-book-btn" href="/session/' + encodeURIComponent(s.share_slug) + '">View &amp; Book</a>'
                    : '';

                return '<div class="session-card">' +
                    '<div class="session-card-head">' +
                        '<span class="session-type-tag">' + escapeHtml(typeLabel) + '</span>' +
                        spotsHtml +
                    '</div>' +
                    '<div class="session-title-text">' + sessionTitle + '</div>' +
                    metaHtml +
                    locationHtmlInner +
                    '<div class="session-footer">' +
                        '<span class="session-price">' + escapeHtml(priceLabel) + '</span>' +
                        bookBtnHtml +
                    '</div>' +
                    '</div>';
            }).join('') +
            '</div>';
    }

    var reviewsHtml = '';
    if (reviews && reviews.length > 0) {
        reviewsHtml = '<div class="reviews-section">' +
            '<h3 class="reviews-title">What clients say</h3>' +
            reviews.map(function(r) {
                var reviewStars = renderStars(r.rating || 5);
                var reviewerName = r.reviewer_name ? escapeHtml(r.reviewer_name) : 'Client';
                var comment = r.comment ? escapeHtml(r.comment) : '';
                return '<div class="review-card">' +
                    '<div class="review-stars">' + reviewStars + '</div>' +
                    (comment ? '<p class="review-comment">\"' + comment + '\"</p>' : '') +
                    '<span class="review-author">â ' + reviewerName + '</span>' +
                    '</div>';
            }).join('') +
            '</div>';
    }

    var notFoundHtml = !coach
        ? '<div class="not-found"><p>This coach profile could not be found.</p></div>'
        : '';

    var openAppBtn = coach
        ? '<a class="cta-btn" id="open-app-btn" href="' + escapeHtml(appScheme) + '">Book a Session in BALLR</a>'
        : '';

    var divider = coach ? '<div class="divider"></div>' : '';

    var ogImage = avatarUrl ? '<meta property="og:image" content="' + escapeHtml(avatarUrl) + '" />' : '';
    var metaDesc = escapeHtml(coachBio || 'Book ' + coachName + ' for a coaching session on BALLR.');

    return '<!DOCTYPE html>\n' +
'<html lang="en">\n' +
'<head>\n' +
'    <meta charset="UTF-8" />\n' +
'    <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n' +
'    <title>' + escapeHtml(coachName) + ' - BALLR Coach</title>\n' +
'    <meta name="description" content="' + metaDesc + '" />\n' +
'    <meta property="og:title" content="' + escapeHtml(coachName) + ' - BALLR Coach" />\n' +
'    <meta property="og:description" content="' + metaDesc + '" />\n' +
'    ' + ogImage + '\n' +
'    <style>\n' +
'        * { box-sizing: border-box; margin: 0; padding: 0; }\n' +
'        body {\n' +
'            background: #0a0a0a;\n' +
'            color: #fff;\n' +
'            font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif;\n' +
'            min-height: 100vh;\n' +
'            display: flex;\n' +
'            flex-direction: column;\n' +
'            align-items: center;\n' +
'            justify-content: flex-start;\n' +
'            padding: 40px 20px 60px;\n' +
'        }\n' +
'        .card {\n' +
'            background: #111;\n' +
'            border: 1px solid ' + accentBorder + ';\n' +
'            border-radius: 20px;\n' +
'            max-width: 480px;\n' +
'            width: 100%;\n' +
'            padding: 32px 24px;\n' +
'            display: flex;\n' +
'            flex-direction: column;\n' +
'            align-items: center;\n' +
'            gap: 20px;\n' +
'            margin-top: 20px;\n' +
'        }\n' +
'        .logo {\n' +
'            font-size: 22px;\n' +
'            font-weight: 800;\n' +
'            letter-spacing: 2px;\n' +
'            color: ' + accentColor + ';\n' +
'            margin-bottom: 4px;\n' +
'        }\n' +
'        .book-title {\n' +
'            font-size: 20px;\n' +
'            font-weight: 700;\n' +
'            color: #fff;\n' +
'            text-align: center;\n' +
'            margin-bottom: 8px;\n' +
'        }\n' +
'        .book-title span {\n' +
'            color: ' + accentColor + ';\n' +
'        }\n' +
'        .avatar {\n' +
'            width: 100px;\n' +
'            height: 100px;\n' +
'            border-radius: 50%;\n' +
'            object-fit: cover;\n' +
'            border: 3px solid ' + accentColor + ';\n' +
'        }\n' +
'        .avatar-placeholder {\n' +
'            width: 100px;\n' +
'            height: 100px;\n' +
'            border-radius: 50%;\n' +
'            background: ' + accentBg + ';\n' +
'            border: 3px solid ' + accentColor + ';\n' +
'            display: flex;\n' +
'            align-items: center;\n' +
'            justify-content: center;\n' +
'            font-size: 36px;\n' +
'            font-weight: 700;\n' +
'            color: ' + accentColor + ';\n' +
'        }\n' +
'        .coach-name {\n' +
'            font-size: 26px;\n' +
'            font-weight: 700;\n' +
'            text-align: center;\n' +
'            color: #fff;\n' +
'        }\n' +
'        .bio {\n' +
'            font-size: 15px;\n' +
'            color: #aaa;\n' +
'            text-align: center;\n' +
'            line-height: 1.6;\n' +
'        }\n' +
'        .location {\n' +
'            font-size: 14px;\n' +
'            color: #aaa;\n' +
'            text-align: center;\n' +
'        }\n' +
'        .rating-row {\n' +
'            display: flex;\n' +
'            align-items: center;\n' +
'            gap: 8px;\n' +
'        }\n' +
'        .stars-display {\n' +
'            font-size: 22px;\n' +
'            color: ' + accentColor + ';\n' +
'            letter-spacing: 2px;\n' +
'        }\n' +
'        .rating-number {\n' +
'            font-size: 18px;\n' +
'            font-weight: 700;\n' +
'        }\n' +
'        .rating-count {\n' +
'            font-size: 13px;\n' +
'            color: #888;\n' +
'        }\n' +
'        .specialties {\n' +
'            display: flex;\n' +
'            flex-wrap: wrap;\n' +
'            gap: 8px;\n' +
'            justify-content: center;\n' +
'        }\n' +
'        .tag {\n' +
'            background: ' + accentBg + ';\n' +
'            border: 1px solid ' + accentBorder + ';\n' +
'            color: ' + accentColor + ';\n' +
'            border-radius: 20px;\n' +
'            padding: 5px 14px;\n' +
'            font-size: 13px;\n' +
'            font-weight: 600;\n' +
'        }\n' +
'        .qualification {\n' +
'            font-size: 14px;\n' +
'            color: #ccc;\n' +
'            text-align: center;\n' +
'            background: ' + accentBg + ';\n' +
'            border: 1px solid ' + accentBorder + ';\n' +
'            border-radius: 10px;\n' +
'            padding: 10px 16px;\n' +
'            width: 100%;\n' +
'        }\n' +
'        .qualification-label {\n' +
'            font-weight: 700;\n' +
'            color: ' + accentColor + ';\n' +
'        }\n' +
'        .sessions-section {\n' +
'            width: 100%;\n' +
'        }\n' +
'        .sessions-title {\n' +
'            font-size: 16px;\n' +
'            font-weight: 700;\n' +
'            color: #fff;\n' +
'            margin-bottom: 12px;\n' +
'            text-align: center;\n' +
'        }\n' +
'        .session-card {\n' +
'            background: #1a1a1a;\n' +
'            border: 1px solid ' + accentBorder + ';\n' +
'            border-radius: 12px;\n' +
'            padding: 14px 16px;\n' +
'            margin-bottom: 10px;\n' +
'            text-align: left;\n' +
'        }\n' +
'        .session-card-head {\n' +
'            display: flex;\n' +
'            align-items: center;\n' +
'            justify-content: space-between;\n' +
'            gap: 8px;\n' +
'            margin-bottom: 8px;\n' +
'        }\n' +
'        .session-type-tag {\n' +
'            background: ' + accentBg + ';\n' +
'            border: 1px solid ' + accentBorder + ';\n' +
'            color: ' + accentColor + ';\n' +
'            border-radius: 20px;\n' +
'            padding: 3px 10px;\n' +
'            font-size: 11px;\n' +
'            font-weight: 700;\n' +
'            text-transform: uppercase;\n' +
'            letter-spacing: 0.5px;\n' +
'        }\n' +
'        .session-spots {\n' +
'            font-size: 12px;\n' +
'            font-weight: 600;\n' +
'            color: #8bd17c;\n' +
'        }\n' +
'        .session-spots-full {\n' +
'            color: #888;\n' +
'        }\n' +
'        .session-title-text {\n' +
'            font-size: 16px;\n' +
'            font-weight: 700;\n' +
'            color: #fff;\n' +
'            margin-bottom: 6px;\n' +
'        }\n' +
'        .session-meta {\n' +
'            display: flex;\n' +
'            flex-wrap: wrap;\n' +
'            gap: 12px;\n' +
'            margin-bottom: 6px;\n' +
'        }\n' +
'        .session-meta-item {\n' +
'            font-size: 13px;\n' +
'            color: #ccc;\n' +
'        }\n' +
'        .session-location {\n' +
'            font-size: 13px;\n' +
'            color: #aaa;\n' +
'            margin-bottom: 10px;\n' +
'        }\n' +
'        .session-footer {\n' +
'            display: flex;\n' +
'            align-items: center;\n' +
'            justify-content: space-between;\n' +
'            gap: 10px;\n' +
'            padding-top: 10px;\n' +
'            border-top: 1px solid ' + accentBorder + ';\n' +
'        }\n' +
'        .session-price {\n' +
'            font-size: 15px;\n' +
'            font-weight: 700;\n' +
'            color: ' + accentColor + ';\n' +
'        }\n' +
'        .session-book-btn {\n' +
'            background: ' + accentColor + ';\n' +
'            color: #000;\n' +
'            font-size: 13px;\n' +
'            font-weight: 700;\n' +
'            padding: 8px 16px;\n' +
'            border-radius: 10px;\n' +
'            text-decoration: none;\n' +
'            white-space: nowrap;\n' +
'        }\n' +
'        .reviews-section {\n' +
'            width: 100%;\n' +
'        }\n' +
'        .reviews-title {\n' +
'            font-size: 16px;\n' +
'            font-weight: 700;\n' +
'            color: #fff;\n' +
'            margin-bottom: 12px;\n' +
'            text-align: center;\n' +
'        }\n' +
'        .review-card {\n' +
'            background: #1a1a1a;\n' +
'            border: 1px solid ' + accentBorder + ';\n' +
'            border-radius: 12px;\n' +
'            padding: 14px 16px;\n' +
'            margin-bottom: 10px;\n' +
'        }\n' +
'        .review-stars {\n' +
'            font-size: 16px;\n' +
'            color: ' + accentColor + ';\n' +
'            margin-bottom: 6px;\n' +
'        }\n' +
'        .review-comment {\n' +
'            font-size: 14px;\n' +
'            color: #ccc;\n' +
'            line-height: 1.5;\n' +
'            margin-bottom: 6px;\n' +
'            font-style: italic;\n' +
'        }\n' +
'        .review-author {\n' +
'            font-size: 12px;\n' +
'            color: #888;\n' +
'        }\n' +
'        .divider {\n' +
'            width: 100%;\n' +
'            height: 1px;\n' +
'            background: ' + accentBorder + ';\n' +
'        }\n' +
'        .cta-btn {\n' +
'            display: block;\n' +
'            width: 100%;\n' +
'            padding: 16px;\n' +
'            background: ' + accentColor + ';\n' +
'            color: #000;\n' +
'            font-size: 17px;\n' +
'            font-weight: 800;\n' +
'            border: none;\n' +
'            border-radius: 14px;\n' +
'            text-align: center;\n' +
'            text-decoration: none;\n' +
'            cursor: pointer;\n' +
'            letter-spacing: 0.5px;\n' +
'        }\n' +
'        .cta-btn:active { opacity: 0.85; }\n' +
'        .app-store-btn {\n' +
'            display: block;\n' +
'            width: 100%;\n' +
'            padding: 14px;\n' +
'            background: transparent;\n' +
'            color: ' + accentColor + ';\n' +
'            font-size: 15px;\n' +
'            font-weight: 700;\n' +
'            border: 2px solid ' + accentColor + ';\n' +
'            border-radius: 14px;\n' +
'            text-align: center;\n' +
'            text-decoration: none;\n' +
'            cursor: pointer;\n' +
'        }\n' +
'        .store-buttons {\n' +
'            display: flex;\n' +
'            gap: 10px;\n' +
'            width: 100%;\n' +
'        }\n' +
'        .store-buttons .app-store-btn {\n' +
'            width: auto;\n' +
'            flex: 1;\n' +
'        }\n' +
'        .powered-by {\n' +
'            font-size: 12px;\n' +
'            color: #555;\n' +
'            margin-top: 12px;\n' +
'        }\n' +
'        .not-found {\n' +
'            color: #888;\n' +
'            text-align: center;\n' +
'            padding: 20px 0;\n' +
'        }\n' +
'    </style>\n' +
'</head>\n' +
'<body>\n' +
'    <div class="card">\n' +
'        <div class="logo">BALLR</div>\n' +
'        ' + (coach ? '<p class="book-title">Book <span>' + escapeHtml(coachName) + '</span> in BALLR</p>' : '') + '\n' +
'        ' + avatarHtml + '\n' +
'        <h1 class="coach-name">' + escapeHtml(coachName) + '</h1>\n' +
'        ' + ratingHtml + '\n' +
'        ' + locationHtml + '\n' +
'        ' + bioHtml + '\n' +
'        ' + qualificationHtml + '\n' +
'        ' + specialtiesHtml + '\n' +
'        ' + sessionsHtml + '\n' +
'        ' + reviewsHtml + '\n' +
'        ' + divider + '\n' +
'        ' + notFoundHtml + '\n' +
'        ' + openAppBtn + '\n' +
'        <div class="store-buttons">\n' +
'            <a class="app-store-btn" href="https://apps.apple.com/gb/app/ballr-club/id6762270628">Download BALLR on iOS</a>\n' +
'            <a class="app-store-btn" href="https://play.google.com/store/apps/details?id=com.ballrapp.app&amp;pcampaignid=web_share">Download BALLR on Android</a>\n' +
'        </div>\n' +
'        <span class="powered-by">Powered by BALLR</span>\n' +
'    </div>\n' +
'    <script>\n' +
'        (function() {\n' +
'            var appScheme = \'' + appScheme.replace(/'/g, "\\'") + '\';\n' +
'            var ua = navigator.userAgent || \'\';\n' +
'            var isAndroid = /android/i.test(ua);\n' +
'            var storeUrl = isAndroid ? \'https://play.google.com/store/apps/details?id=com.ballrapp.app&pcampaignid=web_share\' : \'https://apps.apple.com/gb/app/ballr-club/id6762270628\';\n' +
'            var isMobile = /iphone|ipad|ipod|android/i.test(ua);\n' +
'            if (isMobile && appScheme !== \'ballr://\') {\n' +
'                var didBlur = false;\n' +
'                window.addEventListener(\'blur\', function() { didBlur = true; }, { once: true });\n' +
'                window.location.href = appScheme;\n' +
'                setTimeout(function() {\n' +
'                    if (!didBlur) { window.location.href = storeUrl; }\n' +
'                }, 1500);\n' +
'            }\n' +
'            var btn = document.getElementById(\'open-app-btn\');\n' +
'            if (btn) {\n' +
'                btn.addEventListener(\'click\', function(e) {\n' +
'                    e.preventDefault();\n' +
'                    var didBlur2 = false;\n' +
'                    window.addEventListener(\'blur\', function() { didBlur2 = true; }, { once: true });\n' +
'                    window.location.href = appScheme;\n' +
'                    setTimeout(function() {\n' +
'                        if (!didBlur2) { window.location.href = storeUrl; }\n' +
'                    }, 1500);\n' +
'                });\n' +
'            }\n' +
'        })();\n' +
'    </script>\n' +
'</body>\n' +
'</html>';
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
}
