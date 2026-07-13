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

<?php // ★인기 캐러셀 v2(2026-07-13 유저): 8개·순위 뱃지·조회수·좌우 버튼·우측 페이드(스크롤바 숨김)
if (is_home() && !is_paged()) : $pop = ateflo_popular_posts(8); if ($pop) : ?>
<section class="popular">
  <h2 class="sec-title">많이 읽은 글</h2>
  <div class="car">
    <button type="button" class="car-btn car-prev" aria-label="이전 글 보기" onclick="var a=this.parentNode.querySelector('.album');a.scrollBy({left:-a.clientWidth*0.9,behavior:'smooth'})">&#8249;</button>
    <div class="album">
      <?php $rank = 0; foreach ($pop as $p) : $rank++; $tu = ateflo_thumb_url($p->ID); $vs = (int) get_post_meta($p->ID, 'ateflo_views', true); ?>
      <a class="al-card" href="<?php echo esc_url(get_permalink($p)); ?>">
        <span class="al-thumb"><span class="al-rank r<?php echo min($rank, 4); ?>"><?php echo $rank; ?>위</span><?php if ($tu) : ?><img src="<?php echo esc_url($tu); ?>" alt="" loading="lazy" width="150" height="110"><?php else : ?><span class="ph"><?php echo esc_html(mb_substr($p->post_title, 0, 1)); ?></span><?php endif; ?></span>
        <span class="al-title"><?php echo esc_html(wp_trim_words($p->post_title, 10, '…')); ?></span>
        <?php if ($vs > 0) : ?><span class="al-views"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z"/><circle cx="12" cy="12" r="2.6"/></svg> <?php echo number_format($vs); ?></span><?php endif; ?>
      </a>
      <?php endforeach; ?>
    </div>
    <button type="button" class="car-btn car-next" aria-label="다음 글 보기" onclick="var a=this.parentNode.querySelector('.album');a.scrollBy({left:a.clientWidth*0.9,behavior:'smooth'})">&#8250;</button>
    <span class="car-fade" aria-hidden="true"></span>
  </div>
</section>
<?php endif; endif; ?>

<?php // ★최신 글 텍스트 리스트(2026-07-12 유저: 글 쌓이면 더 보여주기) — 위 카드 10개 이후 15개, 제목+날짜만
if (is_home() && !is_paged()) : $txq = new WP_Query(['post_type' => 'post', 'post_status' => 'publish', 'posts_per_page' => 12, 'offset' => 4, 'no_found_rows' => true]);
if ($txq->have_posts()) : ?>
<section class="txtlist">
  <h2 class="sec-title">더 볼만한 글</h2>
  <ul>
    <?php while ($txq->have_posts()) : $txq->the_post(); ?>
    <li><a href="<?php the_permalink(); ?>"><span class="t"><?php the_title(); ?></span><span class="d"><?php echo get_the_date('n월 j일'); ?></span></a></li>
    <?php endwhile; wp_reset_postdata(); ?>
  </ul>
</section>
<?php endif; endif; ?>

</div><!-- /col-main -->
<?php /* 사이드바 제거(2026-07-12 유저: 안내 링크는 푸터에 이미 — 메인은 글에 전폭) */ ?>
</div><!-- /cols -->

<?php get_footer(); ?>
