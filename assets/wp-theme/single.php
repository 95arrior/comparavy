<?php get_header(); ?>
<?php while (have_posts()) : the_post(); $hero = ateflo_hero_url(get_the_ID()); ?>
<article class="post post-detail">
  <header class="post-hero">
    <?php $cat = get_the_category(); if ($cat) : ?>
      <a class="hero-cat rise r1" href="<?php echo esc_url(get_category_link($cat[0])); ?>"><?php echo esc_html($cat[0]->name); ?></a>
    <?php endif; ?>
    <h1 class="post-title rise r2"><?php the_title(); ?></h1>
    <?php if (has_excerpt()) : ?><p class="post-sub rise r3"><?php echo esc_html(get_the_excerpt()); ?></p><?php endif; ?>
    <?php if ($hero) : ?>
      <figure class="hero-img rise r4"><img src="<?php echo esc_url($hero); ?>" alt="<?php the_title_attribute(); ?> 대표 이미지" width="720" height="405"></figure>
    <?php endif; ?>
    <p class="post-meta rise r5"><?php the_author(); ?> · <?php echo get_the_date('Y년 n월 j일'); ?></p>
  </header>
  <div class="post-body"><?php the_content(); ?></div>
</article>
<nav class="post-nav" aria-label="이전 다음 글">
  <?php $prev = get_previous_post(); $next = get_next_post();
  if ($prev) echo '<a href="' . esc_url(get_permalink($prev)) . '">← ' . esc_html(wp_trim_words($prev->post_title, 8, '…')) . '</a>';
  if ($next) echo '<a href="' . esc_url(get_permalink($next)) . '" style="text-align:right">' . esc_html(wp_trim_words($next->post_title, 8, '…')) . ' →</a>'; ?>
</nav>
<?php endwhile; ?>
<?php get_footer(); ?>
