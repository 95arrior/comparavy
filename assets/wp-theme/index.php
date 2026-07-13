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
if (is_home() || is_category()) : $pop = ateflo_popular_posts(8); if ($pop) : ?>
<section class="popular">
  <h2 class="sec-title">많이 읽은 글</h2>
  <div class="car">
    <button type="button" class="car-btn car-prev" aria-label="이전 글 보기" onclick="var a=this.parentNode.querySelector('.album');a.scrollBy({left:-a.clientWidth*0.9,behavior:'smooth'})">&#8249;</button>
    <div class="album">
      <?php $rank = 0; foreach ($pop as $p) : $rank++; $tu = ateflo_thumb_url($p->ID); $vs = (int) get_post_meta($p->ID, 'ateflo_views', true); ?>
      <a class="al-card" href="<?php echo esc_url(get_permalink($p)); ?>">
        <span class="al-thumb"><span class="al-rank r<?php echo min($rank, 4); ?>"><?php echo $rank; ?>위</span><?php if ($tu) : ?><img src="<?php echo esc_url($tu); ?>" alt="" loading="lazy" width="150" height="110"><?php else : ?><span class="ph"><?php echo esc_html(mb_substr($p->post_title, 0, 1)); ?></span><?php endif; ?></span>
        <span class="al-title"><?php echo esc_html(wp_trim_words($p->post_title, 10, '…')); ?></span>
        <?php if ($vs >= 10) : ?><span class="al-views"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z"/><circle cx="12" cy="12" r="2.6"/></svg> <?php echo number_format($vs); ?></span><?php endif; ?>
      </a>
      <?php endforeach; ?>
    </div>
    <button type="button" class="car-btn car-next" aria-label="다음 글 보기" onclick="var a=this.parentNode.querySelector('.album');a.scrollBy({left:a.clientWidth*0.9,behavior:'smooth'})">&#8250;</button>
    <span class="car-fade" aria-hidden="true"></span>
  </div>
</section>
<?php endif; endif; ?>

<?php // ★2.4.6(유저 확정): 페이지는 상단 리스트용, 하단 섹션은 어느 페이지든 '고정' — 최신 4개(1페이지 카드) 제외 12개.
//  '오늘의 주제'는 제목 옆 칩으로(일별 카테고리 순환), 그 주제 글을 목록 맨 앞으로 당긴다.
if (is_home() || is_category()) : // ★2.4.7: 카테고리(신규 포함) 어디서든 하단 고정 섹션
  $atf_cats = get_categories(['orderby' => 'count', 'order' => 'DESC', 'number' => 6]);
  $atf_cat = $atf_cats ? $atf_cats[(int) date('z') % count($atf_cats)] : null;
  $atf_pool = get_posts(['numberposts' => 20]);
  $atf_skip = array_merge(array_slice(wp_list_pluck($atf_pool, 'ID'), 0, 4), wp_list_pluck($wp_query->posts, 'ID')); // 홈 최신 4 + 지금 화면의 카드(중복 방지)
  $atf_list = array_slice(array_values(array_filter($atf_pool, function ($p) use ($atf_skip) { return !in_array($p->ID, $atf_skip, true); })), 0, 12);
  if ($atf_cat && $atf_list) { $atf_a = []; $atf_b = []; foreach ($atf_list as $p) { if (has_category($atf_cat->term_id, $p)) $atf_a[] = $p; else $atf_b[] = $p; } $atf_list = array_merge($atf_a, $atf_b); }
if ($atf_list) : ?>
<section class="txtlist">
  <div class="sec-row"><h2 class="sec-title">더 볼만한 글</h2><?php if ($atf_cat) : ?><span class="tx-chip">✨ 오늘의 주제 · <?php echo esc_html($atf_cat->name); ?></span><?php endif; ?></div>
  <ul>
    <?php foreach ($atf_list as $p) : ?>
    <li><a href="<?php echo esc_url(get_permalink($p)); ?>"><span class="t"><?php echo esc_html(get_the_title($p)); ?></span><span class="d"><?php echo esc_html(get_the_date('n월 j일', $p)); ?></span></a></li>
    <?php endforeach; ?>
  </ul>
</section>
<?php endif; endif; ?>

</div><!-- /col-main -->
<?php /* 사이드바 제거(2026-07-12 유저: 안내 링크는 푸터에 이미 — 메인은 글에 전폭) */ ?>
</div><!-- /cols -->

<?php get_footer(); ?>
