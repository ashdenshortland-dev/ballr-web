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
        .select(`
            id,
            full_name,
            avatar_url,
            coach_bio,
            coach_rating,
            coach_rating_count,
            coach_specialities,
            coach_license,
            instagram_handle,
            username
        `)
        .eq('username', slug)
        .single();

    if (byUsername) {
        coach = byUsername;
    } else {
        // Try by UUID
        const { data: byId } = await supabase
            .from('profiles')
            .select(`
                id,
                full_name,
                avatar_url,
                coach_bio,
                coach_rating,
                coach_rating_count,
                coach_specialities,
                coach_license,
                instagram_handle,
                username
            `)
            .eq('id', slug)
            .single();

        if (byId) {
            coach = byId;
        }
    }

    if (!coach) {
        return res.status(404).send(renderPage(null));
    }

    return res.status(200).send(renderPage(coach));
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

function renderPage(coach) {
    var appScheme = coach
        ? (coach.username
            ? 'ballr://coach/' + coach.username
            : 'ballr://coach/id/' + coach.id)
        : 'ballr://';

    var coachName = coach ? (coach.full_name || 'Coach') : 'Coach Not Found';
    var coachBio = coach ? (coach.coach_bio || '') : '';
    var coachRating = coach ? (coach.coach_rating || 0) : 0;
    var coachRatingCount = coach ? (coach.coach_rating_count || 0) : 0;
    var coachSpecialities = coach ? (coach.coach_specialities || []) : [];
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

    var notFoundHtml = !coach
        ? '<div class="not-found"><p>This coach profile could not be found.</p></div>'
        : '';

    var openAppBtn = coach
        ? '<a class="cta-btn" id="open-app-btn" href="' + escapeHtml(appScheme) + '">View Profile in BALLR</a>'
        : '';

    var divider = coach ? '<div class="divider"></div>' : '';

    var ogImage = avatarUrl ? '<meta property="og:image" content="' + escapeHtml(avatarUrl) + '" />' : '';
    var metaDesc = escapeHtml(coachBio || 'View ' + coachName + ' coaching profile on BALLR.');

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
'            font-size: 40px;\n' +
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
'            color: #fff;\n' +
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
'        ' + avatarHtml + '\n' +
'        <h1 class="coach-name">' + escapeHtml(coachName) + '</h1>\n' +
'        ' + ratingHtml + '\n' +
'        ' + bioHtml + '\n' +
'        ' + specialtiesHtml + '\n' +
'        ' + divider + '\n' +
'        ' + notFoundHtml + '\n' +
'        ' + openAppBtn + '\n' +
'        <a class="app-store-btn" href="https://apps.apple.com/app/ballr-club/id6742704739">Download BALLR</a>\n' +
'        <span class="powered-by">Powered by BALLR</span>\n' +
'    </div>\n' +
'    <script>\n' +
'        (function() {\n' +
'            var appScheme = \'' + appScheme.replace(/'/g, "\\'") + '\';\n' +
'            var storeUrl = \'https://apps.apple.com/app/ballr-club/id6742704739\';\n' +
'            var ua = navigator.userAgent || \'\';\n' +
'            var isMobile = /iphone|ipad|ipod|android/i.test(ua);\n' +
'            if (isMobile && appScheme !== \'ballr://\') {\n' +
'                var didBlur = false;\n' +
'                window.addEventListener(\'blur\', function() { didBlur = true; }, { once: true });\n' +
'                window.location.href = appScheme;\n' +
'                setTimeout(function() {\n' +
'                    if (!didBlur) {\n' +
'                        // App not installed - stay on page\n' +
'                    }\n' +
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
'    <\/script>\n' +
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
        .replace(/'/g, '&#39;');
}
