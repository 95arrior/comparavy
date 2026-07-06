<?php
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
  if (has_post_thumbnail($post_id)) return get_the_post_thumbnail_url($post_id, 'medium') ?: '';
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
