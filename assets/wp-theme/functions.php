<?php
/* ★임시 디버그(2026-07-13 홈 500 진단) — ?ateflo_debug=1 요청에서만 마지막 치명 오류를 페이지 끝에 출력 */
if (isset($_GET['ateflo_debug'])) {
  register_shutdown_function(function () {
    $e = error_get_last();
    if ($e && in_array($e['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR], true)) {
      echo '<pre style="background:#fff;color:#c00;padding:20px;font-size:14px">ATEFLO DEBUG: ' . htmlspecialchars($e['message'] . ' @ ' . $e['file'] . ':' . $e['line']) . '</pre>';
    }
  });
}

/**
 * Ateflo Toss — 초경량·SEO 100 지향.
 * 원칙: 외부 요청 0, JS 0, 렌더 차단 최소, 메타(title/description/OG/canonical) 완비.
 */

add_action('after_setup_theme', function () {
  add_theme_support('title-tag');
  add_theme_support('post-thumbnails');
  add_theme_support('automatic-feed-links');
  add_theme_support('html5', ['search-form','gallery','caption','style','script']);
});

add_action('wp_enqueue_scripts', function () {
  wp_enqueue_style('ateflo-toss', get_stylesheet_uri(), [], filemtime(get_stylesheet_directory() . '/style.css'));
});

remove_action('wp_head', 'print_emoji_detection_script', 7);
remove_action('wp_print_styles', 'print_emoji_styles');
remove_action('wp_head', 'wp_generator');
remove_action('wp_head', 'wlwmanifest_link');
remove_action('wp_head', 'rsd_link');
remove_action('wp_head', 'wp_shortlink_wp_head');
add_action('wp_enqueue_scripts', function () {
  wp_dequeue_style('wp-block-library');
  wp_dequeue_style('classic-theme-styles');
  wp_dequeue_style('global-styles');
}, 20);

function ateflo_meta_description(): string {
  if (is_singular()) {
    $p = get_queried_object();
    $ex = has_excerpt($p) ? get_the_excerpt($p) : wp_trim_words(wp_strip_all_tags($p->post_content), 40, '…');
    return mb_substr(trim(preg_replace('/\s+/', ' ', $ex)), 0, 155);
  }
  if (is_home() || is_front_page()) return get_bloginfo('description') ?: get_bloginfo('name');
  if (is_category()) { $d = category_description(); return $d ? mb_substr(wp_strip_all_tags($d), 0, 155) : single_cat_title('', false) . ' 관련 글 모음'; }
  return get_bloginfo('name');
}
add_action('wp_head', function () {
  $desc = esc_attr(ateflo_meta_description());
  echo '<meta name="description" content="' . $desc . '">' . "\n";
  echo '<meta property="og:site_name" content="' . esc_attr(get_bloginfo('name')) . '">' . "\n";
  echo '<meta property="og:locale" content="ko_KR">' . "\n";
  if (is_singular()) {
    echo '<meta property="og:type" content="article">' . "\n";
    echo '<meta property="og:title" content="' . esc_attr(get_the_title()) . '">' . "\n";
    echo '<meta property="og:description" content="' . $desc . '">' . "\n";
    echo '<meta property="og:url" content="' . esc_url(get_permalink()) . '">' . "\n";
    if (has_post_thumbnail()) echo '<meta property="og:image" content="' . esc_url(get_the_post_thumbnail_url(null, 'large')) . '">' . "\n";
  }
}, 5);

add_action('wp_head', function () {
  if (!is_singular('post')) return;
  $ld = [
    '@context' => 'https://schema.org', '@type' => 'Article',
    'headline' => get_the_title(),
    'datePublished' => get_the_date('c'),
    'dateModified' => get_the_modified_date('c'),
    'author' => ['@type' => 'Person', 'name' => get_the_author()],
    'mainEntityOfPage' => get_permalink(),
  ];
  if (has_post_thumbnail()) $ld['image'] = get_the_post_thumbnail_url(null, 'large');
  echo '<script type="application/ld+json">' . wp_json_encode($ld, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . '</script>' . "\n";
}, 6);

add_filter('the_content', function ($html) {
  $title = esc_attr(get_the_title());
  $html = preg_replace('/<img(?![^>]*alt=)([^>]*)>/i', '<img alt="' . $title . ' 관련 이미지"$1>', $html);
  return $html;
});

/* ── 목록 썸네일: 대표이미지 → 본문 첫 이미지 폴백(자동 발행 글 대비) ── */
function ateflo_thumb_url($post_id): string {
  if (has_post_thumbnail($post_id)) return get_the_post_thumbnail_url($post_id, 'large') ?: ''; // ★2.4.3: medium(300px)이 모바일 풀폭 카드에서 확대 열화
  $content = get_post_field('post_content', $post_id);
  if (preg_match('/<img[^>]+src="([^"]+)"/i', $content, $m)) return $m[1];
  return '';
}

/* ── 상세 히어로: 대표이미지 → 본문 첫 이미지 승격(중복 방지: 본문에서 제거) ── */
function ateflo_hero_url($post_id): string {
  if (has_post_thumbnail($post_id)) return get_the_post_thumbnail_url($post_id, 'large') ?: '';
  $content = get_post_field('post_content', $post_id);
  if (preg_match('/<img[^>]+src="([^"]+)"/i', $content, $m)) return $m[1];
  return '';
}
add_filter('the_content', function ($html) {
  if (!is_singular('post') || has_post_thumbnail()) return $html;
  // 첫 이미지를 히어로로 올렸으니 본문에서는 1회 제거(중복 노출 방지)
  return preg_replace('/<p[^>]*>\s*<img[^>]+>\s*<\/p>|<img[^>]+>/i', '', $html, 1);
}, 8);

/* ── 광고 자리(애드센스) — 커스터마이저에 코드만 붙이면 상단·중간·하단 자동 게재 ── */
add_action('customize_register', function ($wp_customize) {
  $wp_customize->add_section('ateflo_ads', ['title' => '광고 코드 (애드센스)', 'priority' => 30]);
  foreach (['top' => '본문 상단', 'mid' => '본문 중간(2번째 소제목 앞 자동)', 'bottom' => '본문 하단'] as $k => $label) {
    $wp_customize->add_setting("ateflo_ad_$k", ['default' => '', 'sanitize_callback' => null]);
    $wp_customize->add_control("ateflo_ad_$k", ['section' => 'ateflo_ads', 'label' => $label, 'type' => 'textarea']);
  }
});
add_filter('the_content', function ($html) {
  if (!is_singular('post')) return $html;
  $top = get_theme_mod('ateflo_ad_top', '');
  $mid = get_theme_mod('ateflo_ad_mid', '');
  $bottom = get_theme_mod('ateflo_ad_bottom', '');
  if ($top) $html = '<div class="ad-slot">' . $top . '</div>' . $html;
  if ($mid) { // 2번째 h2 직전 — 읽는 흐름 안 깨는 표준 자리
    $parts = preg_split('/(<h2[^>]*>)/i', $html, -1, PREG_SPLIT_DELIM_CAPTURE);
    if (count($parts) >= 5) { $parts[3] = '<div class="ad-slot">' . $mid . '</div>' . $parts[3]; $html = implode('', $parts); }
  }
  if ($bottom) $html .= '<div class="ad-slot">' . $bottom . '</div>';
  return $html;
}, 20);

/* ── v2.0: 커스텀 로고(사용자 정의 → 사이트 아이덴티티에서 업로드) ── */
add_action('after_setup_theme', function () {
  add_theme_support('custom-logo', ['height' => 64, 'width' => 64, 'flex-width' => true]);
});

/* ── 상단 목록 4개(2026-07-13 유저: 카테고리별 최근 4개까지 — 아래 많이 읽은 글·텍스트 리스트가 이어받음) ── */
add_action('pre_get_posts', function ($q) {
  if (!is_admin() && $q->is_main_query() && ($q->is_home() || $q->is_category())) $q->set('posts_per_page', 4);
});

/* ── 조회수 자동 집계(플러그인 없이) — 인기 글 섹션 데이터원 ── */
add_action('wp_head', function () {
  if (!is_singular('post') || current_user_can('edit_posts')) return;
  // ★2.4.4: 봇 제외(실측: 조회수가 크롤러 카운트 — 구글봇·네이버 예티·링크 미리보기가 다 +1이었음)
  $ua = $_SERVER['HTTP_USER_AGENT'] ?? '';
  if ($ua === '' || preg_match('/bot|crawl|spider|slurp|yeti|daum|kakao|facebook|whatsapp|telegram|preview|curl|wget|python|httpclient|scrapy|gpt|claude|bing|petal|semrush|ahrefs/i', $ua)) return;
  $id = get_the_ID();
  update_post_meta($id, 'ateflo_views', ((int) get_post_meta($id, 'ateflo_views', true)) + 1);
});

/* 인기 글 N개 — 조회수 순, 데이터 부족하면 최신으로 자연 폴백 */
function ateflo_popular_posts(int $n = 5): array {
  $q = get_posts(['numberposts' => $n, 'meta_key' => 'ateflo_views', 'orderby' => 'meta_value_num', 'order' => 'DESC']);
  if (count($q) < $n) $q = array_merge($q, get_posts(['numberposts' => $n - count($q), 'exclude' => wp_list_pluck($q, 'ID')]));
  return $q;
}

/* ── v2.1: 스크롤 리빌(초경량 인라인 — 외부 요청 0 유지) ── */
add_action('wp_footer', function () { ?>
<script>document.addEventListener('DOMContentLoaded',function(){var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}})},{threshold:.08});document.querySelectorAll('.row,.al-card,.rel-card').forEach(function(el){el.classList.add('reveal');io.observe(el)})});</script>
<?php });

/* 관련 글 3개 — 같은 카테고리(내부 링크·체류) */
function ateflo_related_posts($post_id, int $n = 3): array {
  $cats = wp_get_post_categories($post_id);
  $rel = $cats ? get_posts(['numberposts' => $n, 'category__in' => $cats, 'exclude' => [$post_id]]) : [];
  if (count($rel) < $n) { // 같은 카테고리가 모자라면 최신 글로 채움 — 자리가 비지 않게
    $ids = array_merge([$post_id], wp_list_pluck($rel, 'ID'));
    $rel = array_merge($rel, get_posts(['numberposts' => $n - count($rel), 'exclude' => $ids]));
  }
  return $rel;
}

/* v2.2: 협업 문의 이메일(사용자 정의 → 블로그 정보) */
add_action('customize_register', function ($wp_customize) {
  $wp_customize->add_section('ateflo_info', ['title' => '블로그 정보(사이드바)', 'priority' => 25]);
  $wp_customize->add_setting('ateflo_contact_email', ['default' => '', 'sanitize_callback' => 'sanitize_email']);
  $wp_customize->add_control('ateflo_contact_email', ['section' => 'ateflo_info', 'label' => '협업 문의 이메일', 'type' => 'email']);
});


/* v2.2.2: 페이지 탐색 다중 제목(자동 생성 페이지 '{사이트명} 소개'·'문의하기'도 인식) */
function ateflo_find_page(array $titles) {
  foreach ($titles as $t) { $pg = get_page_by_title($t); if ($pg) return $pg; }
  return null;
}


/* v2.3: 개인정보처리방침 URL — WP 설정 미지정이어도 페이지 제목으로 탐색 */
function ateflo_privacy_url(): string {
  $u = get_privacy_policy_url();
  if ($u) return $u;
  $pg = ateflo_find_page(['개인정보처리방침', '개인정보 처리방침']);
  return $pg ? get_permalink($pg) : '';
}
