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
        return res.status(404).send(renderPage(null, []));
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

    return res.status(200).send(renderPage(coach, reviews));
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

function renderPage(coach, reviews) {
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
    var coachLicense = coach ? (coach.coach_license || '') : '';
    var coachLocation = coach ? (coach.location || '') : '';
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

    var locationHtml = coachLocation
        ? '<div class="location">\u{1F4CD} ' + escapeHtml(coachLocation) + '</div>'
        : '';

    var qualificationHtml = coachLicense
        ? '<div class="qualification"><span class="qualification-label">\u{1F3C5} Qualification: </span>' + escapeHtml(coachLicense) + '</div>'
        : '';

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
                    '<span class="review-author">— ' + reviewerName + '</span>' +
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
'        ' + reviewsHtml + '\n' +
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
