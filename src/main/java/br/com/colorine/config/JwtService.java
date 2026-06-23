package br.com.colorine.config;

import br.com.colorine.domain.UserRole;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class JwtService {

  private final String secret;
  private final long expirationSeconds;

  public JwtService(
      @Value("${app.jwt.secret}") String secret,
      @Value("${app.jwt.expiration-hours:12}") long expirationHours
  ) {
    this.secret = secret;
    this.expirationSeconds = expirationHours * 3600;
  }

  public String createToken(String email, UserRole role) {
    long expiresAt = Instant.now().getEpochSecond() + expirationSeconds;
    String header = base64Url("{\"alg\":\"HS256\",\"typ\":\"JWT\"}");
    String payload = base64Url("""
        {"sub":"%s","role":"%s","exp":%d}
        """.formatted(email, role.name(), expiresAt).trim());
    String signature = hmac(header + "." + payload);
    return header + "." + payload + "." + signature;
  }

  public String subject(String token) {
    if (!isValid(token)) return null;
    String payload = new String(Base64.getUrlDecoder().decode(token.split("\\.")[1]), StandardCharsets.UTF_8);
    return value(payload, "sub");
  }

  public boolean isValid(String token) {
    try {
      String[] parts = token.split("\\.");
      if (parts.length != 3 || !hmac(parts[0] + "." + parts[1]).equals(parts[2])) return false;
      String payload = new String(Base64.getUrlDecoder().decode(parts[1]), StandardCharsets.UTF_8);
      String exp = value(payload, "exp");
      return exp != null && Long.parseLong(exp) > Instant.now().getEpochSecond();
    } catch (RuntimeException error) {
      return false;
    }
  }

  private String value(String json, String key) {
    String quoted = "\"" + key + "\":";
    int start = json.indexOf(quoted);
    if (start < 0) return null;
    start += quoted.length();
    if (json.charAt(start) == '"') {
      int end = json.indexOf('"', start + 1);
      return json.substring(start + 1, end);
    }
    int end = json.indexOf(',', start);
    if (end < 0) end = json.indexOf('}', start);
    return json.substring(start, end).trim();
  }

  private String hmac(String value) {
    try {
      Mac mac = Mac.getInstance("HmacSHA256");
      mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
      return Base64.getUrlEncoder().withoutPadding().encodeToString(mac.doFinal(value.getBytes(StandardCharsets.UTF_8)));
    } catch (Exception error) {
      throw new IllegalStateException("Nao foi possivel gerar token.", error);
    }
  }

  private String base64Url(String value) {
    return Base64.getUrlEncoder().withoutPadding().encodeToString(value.getBytes(StandardCharsets.UTF_8));
  }
}
