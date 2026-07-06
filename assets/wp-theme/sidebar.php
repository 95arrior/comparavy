<aside class="side" aria-label="블로그 정보">
  <div class="side-card">
    <?php if (has_custom_logo()) { $logo = wp_get_attachment_image_src(get_theme_mod('custom_logo'), 'medium'); if ($logo) echo '<img class="side-logo" src="' . esc_url($logo[0]) . '" alt="' . esc_attr(get_bloginfo('name')) . ' 로고" width="240" height="240">'; } ?>
    <p class="side-name"><?php bloginfo('name'); ?></p>
    <?php if (get_bloginfo('description')) : ?><p class="side-desc"><?php echo esc_html(get_bloginfo('description')); ?></p><?php endif; ?>
    <ul class="side-links">
      <?php $items = [['운영자 소개', ['운영자 소개']], ['블로그 소개', ['소개', get_bloginfo('name') . ' 소개']], ['문의', ['문의', '문의하기']]];
      foreach ($items as [$label, $titles]) { $pg = ateflo_find_page($titles); if ($pg) echo '<li><a href="' . esc_url(get_permalink($pg)) . '">' . esc_html($label) . '</a></li>'; } ?>
      <li><a href="<?php echo esc_url(get_privacy_policy_url() ?: home_url('/')); ?>">개인정보처리방침</a></li>
    </ul>
    <?php $mail = get_theme_mod('ateflo_contact_email', ''); if ($mail) : ?>
      <p class="side-mail">협업 문의 · <a href="mailto:<?php echo esc_attr($mail); ?>"><?php echo esc_html($mail); ?></a></p>
    <?php endif; ?>
  </div>
</aside>
