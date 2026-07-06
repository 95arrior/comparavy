</main>
<footer class="site-foot">
  <div class="in">
    <span>© <?php echo date('Y'); ?> <?php bloginfo('name'); ?></span>
    <span>
      <?php $fitems = [['소개', ['소개', get_bloginfo('name') . ' 소개']], ['운영자 소개', ['운영자 소개']], ['문의', ['문의', '문의하기']]];
      foreach ($fitems as [$label, $titles]) { $pg = ateflo_find_page($titles); if ($pg) echo '<a href="' . esc_url(get_permalink($pg)) . '">' . esc_html($label) . '</a> · '; } ?>
      <a href="<?php echo esc_url(get_privacy_policy_url() ?: home_url('/')); ?>">개인정보처리방침</a> · <a href="<?php echo esc_url(home_url('/sitemap.xml')); ?>">Sitemap</a>
    </span>
  </div>
</footer>
<?php wp_footer(); ?>
</body>
</html>
