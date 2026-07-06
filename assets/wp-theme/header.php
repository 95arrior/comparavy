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
    <a class="site-logo" href="<?php echo esc_url(home_url('/')); ?>"><?php bloginfo('name'); ?><b>.</b></a>
    <nav class="site-nav" aria-label="주요 메뉴">
      <?php $cats = get_categories(['number' => 3, 'orderby' => 'count', 'order' => 'DESC']);
      foreach ($cats as $c) echo '<a href="' . esc_url(get_category_link($c)) . '">' . esc_html($c->name) . '</a>'; ?>
    </nav>
  </div>
</header>
<main id="main" class="wrap">
