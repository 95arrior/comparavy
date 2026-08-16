<!doctype html>
<html <?php language_attributes(); ?>>
<head>
<meta charset="<?php bloginfo('charset'); ?>">
<meta name="viewport" content="width=device-width, initial-scale=1">
<?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>
<a class="skip" href="#main">본문 바로가기</a>
<header class="site-head">
  <div class="in">
    <a class="site-logo" href="<?php echo esc_url(home_url('/')); ?>">
      <?php // 로고를 올리면(사용자 정의하기 > 사이트 아이덴티티) 텍스트 대신 로고만, 없으면 텍스트(점 없이 — 2026-07-12 유저 요청)
      if (has_custom_logo()) { $logo = wp_get_attachment_image_src(get_theme_mod('custom_logo'), 'full'); if ($logo) { echo '<img class="logo-img" src="' . esc_url($logo[0]) . '" alt="' . esc_attr(get_bloginfo('name')) . '">'; } else { echo '<span>' . esc_html(get_bloginfo('name')) . '</span>'; } }
      else { echo '<span>' . esc_html(get_bloginfo('name')) . '</span>'; } ?>
    </a>
    <nav class="site-nav" aria-label="주요 메뉴">
      <?php $about = ateflo_find_page(['소개', get_bloginfo('name') . ' 소개', '운영자 소개']);
      if ($about) echo '<a class="pill" href="' . esc_url(get_permalink($about)) . '">소개</a>';
      $contact = ateflo_find_page(['문의', '문의하기']);
      if ($contact) echo '<a class="pill pill-b" href="' . esc_url(get_permalink($contact)) . '">문의</a>'; ?>
    </nav>
  </div>
</header>
<main id="main" class="wrap">
