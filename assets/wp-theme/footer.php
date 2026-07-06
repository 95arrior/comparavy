</main>
<footer class="site-foot">
  <div class="in">
    <span>© <?php echo date('Y'); ?> <?php bloginfo('name'); ?></span>
    <span>
      <?php foreach (['소개', '운영자 소개', '문의'] as $t) { $pg = get_page_by_title($t); if ($pg) echo '<a href="' . esc_url(get_permalink($pg)) . '">' . esc_html($t) . '</a> · '; } ?>
      <a href="<?php echo esc_url(get_privacy_policy_url() ?: home_url('/')); ?>">개인정보처리방침</a> · <a href="<?php echo esc_url(home_url('/sitemap.xml')); ?>">Sitemap</a>
    </span>
  </div>
</footer>
<?php wp_footer(); ?>
</body>
</html>
