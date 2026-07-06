<?php get_header(); ?>

<?php if (is_home() && !is_paged()) : ?>
<section class="home-hero">
  <h1><?php bloginfo('name'); ?></h1>
  <p><?php echo esc_html(get_bloginfo('description') ?: '매일 한 편, 도움이 되는 글'); ?></p>
</section>
<?php endif; ?>

<div class="cards">
<?php if (have_posts()) : while (have_posts()) : the_post(); ?>
  <article class="card">
    <a href="<?php the_permalink(); ?>" aria-label="<?php the_title_attribute(); ?>">
      <?php $cat = get_the_category(); if ($cat) echo '<span class="cat">' . esc_html($cat[0]->name) . '</span>'; ?>
      <h2><?php the_title(); ?></h2>
      <p class="ex"><?php echo esc_html(wp_trim_words(get_the_excerpt(), 30, '…')); ?></p>
      <p class="meta"><?php echo get_the_date('Y년 n월 j일'); ?></p>
    </a>
  </article>
<?php endwhile; else : ?>
  <article class="card"><h2>아직 글이 없어요</h2><p class="ex">첫 글이 곧 자동으로 올라와요.</p></article>
<?php endif; ?>
</div>

<nav class="pagination" aria-label="페이지"><?php echo paginate_links(['prev_text' => '이전', 'next_text' => '다음']); ?></nav>

<?php get_footer(); ?>
