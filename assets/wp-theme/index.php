<?php get_header(); ?>

<?php if (is_home() && !is_paged()) : ?>
<section class="home-hero">
  <h1><?php bloginfo('name'); ?></h1>
  <p><?php echo esc_html(get_bloginfo('description') ?: '매일 한 편, 도움이 되는 글'); ?></p>
</section>
<?php elseif (is_category()) : ?>
<section class="home-hero"><h1><?php single_cat_title(); ?></h1><p><?php echo esc_html(single_cat_title('', false)); ?> 글 모음</p></section>
<?php elseif (is_search()) : ?>
<section class="home-hero"><h1>“<?php the_search_query(); ?>” 검색 결과</h1></section>
<?php endif; ?>

<div class="cols">
<div class="col-main">
<?php if (is_home() || is_category()) : ?>
<nav class="cat-bar" aria-label="카테고리">
  <a href="<?php echo esc_url(home_url('/')); ?>" class="<?php echo is_home() ? 'on' : ''; ?>">전체</a>
  <?php foreach (get_categories(['orderby' => 'count', 'order' => 'DESC', 'number' => 8]) as $c) : ?>
    <a href="<?php echo esc_url(get_category_link($c)); ?>" class="<?php echo is_category($c->term_id) ? 'on' : ''; ?>"><?php echo esc_html($c->name); ?></a>
  <?php endforeach; ?>
</nav>
<?php endif; ?>

<div class="rows">
<?php if (have_posts()) : while (have_posts()) : the_post(); $tu = ateflo_thumb_url(get_the_ID()); ?>
  <article class="row">
    <a class="thumb" href="<?php the_permalink(); ?>" tabindex="-1" aria-hidden="true">
      <?php if ($tu) : ?><img src="<?php echo esc_url($tu); ?>" alt="" loading="lazy" width="104" height="104">
      <?php else : ?><span class="ph"><?php echo esc_html(mb_substr(get_the_title(), 0, 1)); ?></span><?php endif; ?>
    </a>
    <div class="tx">
      <a href="<?php the_permalink(); ?>">
        <?php $cat = get_the_category(); if ($cat) echo '<span class="cat">' . esc_html($cat[0]->name) . '</span>'; ?>
        <h2><?php the_title(); ?></h2>
        <p class="ex"><?php echo esc_html(wp_trim_words(get_the_excerpt(), 24, '…')); ?></p>
        <p class="meta"><?php echo get_the_date('Y년 n월 j일'); ?></p>
      </a>
    </div>
  </article>
<?php endwhile; else : ?>
  <article class="row"><div class="tx"><h2><?php echo is_search() ? '검색 결과가 없어요' : '아직 글이 없어요'; ?></h2><p class="ex"><?php echo is_search() ? '다른 검색어로 시도해 보세요.' : '첫 글이 곧 자동으로 올라와요.'; ?></p></div></article>
<?php endif; ?>
</div>

<nav class="pagination" aria-label="페이지"><?php echo paginate_links(['prev_text' => '이전', 'next_text' => '다음']); ?></nav>

<?php if (is_home() && !is_paged()) : $pop = ateflo_popular_posts(5); if ($pop) : ?>
<section class="popular">
  <h2 class="sec-title">많이 읽은 글</h2>
  <div class="album">
    <?php foreach ($pop as $p) : $tu = ateflo_thumb_url($p->ID); ?>
    <a class="al-card" href="<?php echo esc_url(get_permalink($p)); ?>">
      <span class="al-thumb"><?php if ($tu) : ?><img src="<?php echo esc_url($tu); ?>" alt="" loading="lazy" width="150" height="110"><?php else : ?><span class="ph"><?php echo esc_html(mb_substr($p->post_title, 0, 1)); ?></span><?php endif; ?></span>
      <span class="al-title"><?php echo esc_html(wp_trim_words($p->post_title, 10, '…')); ?></span>
    </a>
    <?php endforeach; ?>
  </div>
</section>
<?php endif; endif; ?>

</div><!-- /col-main -->
<?php if (!is_paged()) get_sidebar(); ?>
</div><!-- /cols -->

<?php get_footer(); ?>
