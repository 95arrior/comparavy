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
      <?php if (has_custom_logo()) { $logo = wp_get_attachment_image_src(get_theme_mod('custom_logo'), 'thumbnail'); if ($logo) echo '<img class="logo-img" src="' . esc_url($logo[0]) . '" alt="" width="34" height="34">'; } ?>
      <span><?php bloginfo('name'); ?><b>.</b></span>
    </a>
    <nav class="site-nav" aria-label="주요 메뉴">
      <?php $about = get_page_by_title('소개') ?: get_page_by_title('운영자 소개');
      if ($about) echo '<a class="pill" href="' . esc_url(get_permalink($about)) . '">소개</a>';
      $contact = get_page_by_title('문의');
      if ($contact) echo '<a class="pill pill-b" href="' . esc_url(get_permalink($contact)) . '">문의</a>'; ?>
    </nav>
  </div>
</header>
<main id="main" class="wrap">
