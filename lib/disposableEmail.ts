// 일회용(임시) 이메일 도메인 차단 — 무료 3회 어뷰징(대량 계정 생성) 방어.
// 가장 흔한 임시메일 제공자 위주의 큐레이션 목록. 전체(~3,000개) 목록은
// 추후 GitHub `disposable-email-domains`를 DB에 적재해 확장 가능.
const DISPOSABLE_DOMAINS = new Set<string>([
  "mailinator.com", "guerrillamail.com", "guerrillamail.net", "guerrillamail.org",
  "sharklasers.com", "grr.la", "guerrillamailblock.com", "spam4.me",
  "10minutemail.com", "10minutemail.net", "20minutemail.com", "tempmail.com",
  "temp-mail.org", "temp-mail.io", "tempmail.io", "tempmailo.com", "tempr.email",
  "tmail.com", "tmpmail.org", "tmpmail.net", "minuteinbox.com", "fakeinbox.com",
  "trashmail.com", "trashmail.net", "trash-mail.com", "trashmail.de", "wegwerfmail.de",
  "yopmail.com", "yopmail.net", "yopmail.fr", "cool.fr.nf", "jetable.org",
  "mailnesia.com", "maildrop.cc", "mailcatch.com", "getnada.com", "nada.email",
  "dispostable.com", "maileater.com", "spambog.com", "spambox.us", "mytemp.email",
  "throwawaymail.com", "throwawayemailaddresses.com", "mohmal.com", "emailondeck.com",
  "moakt.com", "tempinbox.com", "fakemailgenerator.com", "burnermail.io",
  "33mail.com", "anonbox.net", "mailsac.com", "inboxkitten.com", "mail-temp.com",
  "luxusmail.org", "mailpoof.com", "harakirimail.com", "discard.email", "discardmail.com",
  "spamgourmet.com", "tempemail.co", "tempmailaddress.com", "1secmail.com",
  "1secmail.org", "1secmail.net", "kzccv.com", "qzxor.com", "vjuum.com",
  "wuuvo.com", "laafd.com", "txcct.com", "rteet.com", "dpptd.com",
  "byom.de", "muellmail.com", "vomoto.com", "spamavert.com", "incognitomail.com",
  "tafmail.com", "gufum.com", "tmpbox.net", "easytrashmail.com", "mailtemp.net",
]);

/** 이메일이 알려진 일회용 도메인인지 검사. */
export function isDisposableEmail(email: string): boolean {
  const at = email.lastIndexOf("@");
  if (at === -1) return false;
  const domain = email.slice(at + 1).trim().toLowerCase();
  return DISPOSABLE_DOMAINS.has(domain);
}
