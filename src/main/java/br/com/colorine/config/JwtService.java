package br.com.colorine.config;

import br.com.colorine.domain.UserRole;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class JwtService {

  private static final ObjectMapper JSON = new ObjectMapper();
  private static final Base64.Encoder ENCODER = Base64.getUrlEncoder().withoutPadding();
  private static final Base64.Decoder DECODER = Base64.getUrlDecoder();

  private final String secret;
  private final long expirationHours;

  public JwtService(
      @Value("${app.jwt.secret}") String secret,
      @Value("${app.jwt.expiration-hours}") long expirationHours
  ) {
    this.secret = secret;
    this.expirationHours = expirationHours;
  }

  public String createToken(String email, UserRole role) {
    Instant now = Instant.now();
    Map<String, Object> header = Map.of("alg", "HS256", "typ", "JWT");
    Map<String, Object> payload = new LinkedHashMap<>();
    payload.put("sub", email);
    payload.put("role", role.name());
    payload.put("iat", now.getEpochSecond());
    payload.put("exp", now.plus(expirationHours, ChronoUnit.HOURS).getEpochSecond());

    String unsignedToken = encode(header) + "." + encode(payload);
    return unsignedToken + "." + sign(unsignedToken);
  }

  public String subject(String token) {
    Map<String, Object> payload = parseAndValidate(token);
    return String.valueOf(payload.get("sub"));
  }

  private Map<String, Object> parseAndValidate(String token) {
    String[] parts = token.split("\\.");
    if (parts.length != 3) {
      throw new IllegalArgumentException("Token invalido.");
    }

    String unsignedToken = parts[0] + "." + parts[1];
    if (!constantTimeEquals(sign(unsignedToken), parts[2])) {
      throw new IllegalArgumentException("Assinatura invalida.");
    }

    try {
      Map<String, Object> payload = JSON.readValue(DECODER.decode(parts[1]), new TypeReference<>() {});
      long expiresAt = ((Number) payload.get("exp")).longValue();
      if (Instant.now().getEpochSecond() >= expiresAt) {
        throw new IllegalArgumentException("Token expirado.");
      }
      return payload;
    } catch (Exception error) {
      throw new IllegalArgumentException("Token invalido.", error);
    }
  }

  private String encode(Map<String, Object> value) {
    try {
      return ENCODER.encodeToString(JSON.writeValueAsBytes(value));
    } catch (Exception error) {
      throw new IllegalStateException("Nao foi possivel criar o token.", error);
    }
  }

  private String sign(String value) {
    try {
      Mac mac = Mac.getInstance("HmacSHA256");
      mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
      return ENCODER.encodeToString(mac.doFinal(value.getBytes(StandardCharsets.UTF_8)));
    } catch (Exception error) {
      throw new IllegalStateException("Nao foi possivel assinar o token.", error);
    }
  }

  private boolean constantTimeEquals(String first, String second) {
    byte[] firstBytes = first.getBytes(StandardCharsets.UTF_8);
    byte[] secondBytes = second.getBytes(StandardCharsets.UTF_8);
    if (firstBytes.length != secondBytes.length) {
      return false;
    }

    int result = 0;
    for (int index = 0; index < firstBytes.length; index++) {
      result |= firstBytes[index] ^ secondBytes[index];
    }
    return result == 0;
  }
}
