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
    <p class="post-meta rise r5"><?php the_author(); ?> · <?php echo get_the_date('Y년 n월 j일'); ?> <?php $atf_v = (int) get_post_meta(get_the_ID(), 'ateflo_views', true); if ($atf_v >= 10) : /* ★2.4.4: 10 미만 숨김 — 신생 티 방지 */ ?><span class="meta-views"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z"/><circle cx="12" cy="12" r="2.6"/></svg> <?php echo number_format($atf_v); ?></span><?php endif; ?></p>
  </header>
  <div class="post-body"><?php the_content(); ?></div>
</article>
<?php $rel = ateflo_related_posts(get_the_ID()); if ($rel) : ?>
<section class="related">
  <h2 class="sec-title">함께 보면 좋은 글</h2>
  <div class="rel-grid">
    <?php foreach ($rel as $r) : ?><a class="rel-card" href="<?php echo esc_url(get_permalink($r)); ?>"><?php echo esc_html($r->post_title); ?></a><?php endforeach; ?>
  </div>
</section>
<?php endif; ?>
<nav class="post-nav" aria-label="이전 다음 글">
  <?php $prev = get_previous_post(); $next = get_next_post();
  if ($prev) echo '<a href="' . esc_url(get_permalink($prev)) . '">← ' . esc_html(wp_trim_words($prev->post_title, 8, '…')) . '</a>';
  if ($next) echo '<a href="' . esc_url(get_permalink($next)) . '" style="text-align:right">' . esc_html(wp_trim_words($next->post_title, 8, '…')) . ' →</a>'; ?>
</nav>
<?php endwhile; ?>
<?php get_footer(); ?>
