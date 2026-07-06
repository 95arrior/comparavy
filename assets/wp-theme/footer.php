</main>
<footer class="site-foot">
  <div class="in">
    <span>© <?php echo date('Y'); ?> <?php bloginfo('name'); ?></span>
    <span><a href="<?php echo esc_url(home_url('/sitemap.xml')); ?>">Sitemap</a> · <a href="<?php echo esc_url(get_privacy_policy_url() ?: home_url('/')); ?>">개인정보처리방침</a></span>
  </div>
</footer>
<?php wp_footer(); ?>
</body>
</html>
