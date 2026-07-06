<?php get_header(); ?>
<?php while (have_posts()) : the_post(); ?>
<article class="post">
  <?php $cat = get_the_category(); if ($cat) echo '<span class="cat" style="display:inline-block;font-size:12px;font-weight:700;color:#1d75f7;background:rgba(29,117,247,.08);padding:3px 10px;border-radius:999px">' . esc_html($cat[0]->name) . '</span>'; ?>
  <h1 class="post-title"><?php the_title(); ?></h1>
  <p class="post-meta"><?php echo get_the_date('Y년 n월 j일'); ?> · <?php the_author(); ?></p>
  <div class="post-body"><?php the_content(); ?></div>
</article>
<nav class="post-nav" aria-label="이전 다음 글">
  <?php $prev = get_previous_post(); $next = get_next_post();
  if ($prev) echo '<a href="' . esc_url(get_permalink($prev)) . '">← ' . esc_html(wp_trim_words($prev->post_title, 8, '…')) . '</a>';
  if ($next) echo '<a href="' . esc_url(get_permalink($next)) . '" style="text-align:right">' . esc_html(wp_trim_words($next->post_title, 8, '…')) . ' →</a>'; ?>
</nav>
<?php endwhile; ?>
<?php get_footer(); ?>
