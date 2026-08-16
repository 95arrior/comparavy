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
  // ★2.5.1(2026-07-31 실측: 칩이 '오늘의 주제·예금·금리'인데 목록 12개 중 그 주제 글은 2개뿐 — 라벨과 내용 불일치).
  //  2.5.0은 '주제 글을 맨 앞으로 당기기'까지만 했다. 읽는 사람에겐 여전히 잡탕이라 칩이 거짓말로 읽힌다.
  //  풀을 넉넉히 잡아 주제 글을 충분히 확보하고, 아래에서 '그 주제 글만' 남긴다.
  $atf_pool = get_posts(['numberposts' => 40]);
  $atf_skip = array_merge(array_slice(wp_list_pluck($atf_pool, 'ID'), 0, 4), wp_list_pluck($wp_query->posts, 'ID')); // 홈 최신 4 + 지금 화면의 카드(중복 방지)
  $atf_all = array_values(array_filter($atf_pool, function ($p) use ($atf_skip) { return !in_array($p->ID, $atf_skip, true); }));
  $atf_list = array_slice($atf_all, 0, 12);
  // ★2.5.0(2026-07-20 실측: '오늘의 주제·지원금'인데 목록에 지원금 글 0 — 주제와 목록 불일치):
  //  칩은 '지금 목록에 실제로 있는' 카테고리 중에서만 일별 순환. 후보 없으면 칩 숨김(거짓 라벨 금지).
  $atf_cat = null;
  if ($atf_all) {
    $atf_cat_ids = [];
    foreach ($atf_all as $p) { foreach (wp_get_post_categories($p->ID) as $cid) { $atf_cat_ids[$cid] = true; } }
    $atf_cands = array_values(array_filter(array_map('get_category', array_keys($atf_cat_ids)), function ($c) { return $c && !is_wp_error($c) && strtolower($c->slug) !== 'uncategorized'; }));
    usort($atf_cands, function ($a, $b) { return $a->term_id - $b->term_id; }); // 순환 안정용 고정 순서
    if ($atf_cands) $atf_cat = $atf_cands[(int) date('z') % count($atf_cands)];
  }
  // ★칩이 붙으면 그 주제 글'만' 보여준다 — 라벨과 내용을 일치시킨다.
  //  단 4편 미만이면 목록이 빈약해지므로 칩을 떼고 혼합 목록으로 되돌린다(거짓 라벨보다 라벨 없음이 낫다).
  if ($atf_cat) {
    $atf_only = array_values(array_filter($atf_all, function ($p) use ($atf_cat) { return has_category($atf_cat->term_id, $p); }));
    if (count($atf_only) >= 4) { $atf_list = array_slice($atf_only, 0, 12); }
    else { $atf_cat = null; $atf_list = array_slice($atf_all, 0, 12); }
  }
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
