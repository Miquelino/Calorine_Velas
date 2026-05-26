package br.com.colorine.config;

import br.com.colorine.domain.CandleProduct;
import br.com.colorine.domain.UserAccount;
import br.com.colorine.domain.UserRole;
import br.com.colorine.repository.CandleProductRepository;
import br.com.colorine.repository.UserAccountRepository;
import java.math.BigDecimal;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class DataInitializer {

  @Bean
  CommandLineRunner seedData(
      UserAccountRepository users,
      CandleProductRepository candles,
      PasswordEncoder passwordEncoder
  ) {
    return args -> {
      if (!users.existsByEmail("admin@colorine.com")) {
        UserAccount admin = new UserAccount();
        admin.setName("Administradora Colorine");
        admin.setEmail("admin@colorine.com");
        admin.setPhone("");
        admin.setRole(UserRole.ADMIN);
        admin.setPasswordHash(passwordEncoder.encode("admin123"));
        users.save(admin);
      }

      if (candles.count() == 0) {
        candles.save(candle(
            "Brisa de Lavanda",
            "Lavanda e alecrim",
            "Vela calmante em pote de vidro, ideal para banho relaxante ou leitura no fim do dia.",
            "54.90",
            18,
            "sage"
        ));
        candles.save(candle(
            "Doce Baunilha",
            "Baunilha e tonka",
            "Aroma acolhedor e cremoso, feito para deixar a casa com cheiro de sobremesa elegante.",
            "49.90",
            24,
            "honey"
        ));
        candles.save(candle(
            "Figo Rosado",
            "Figo, rosas e madeira",
            "Uma vela marcante para presente, com perfume floral frutado e acabamento artesanal.",
            "64.90",
            10,
            "rose"
        ));
        candles.save(candle(
            "Mar de Linho",
            "Algodao, sal e cedro",
            "Fresca e limpa, perfeita para sala, lavabo e ambientes que pedem leveza.",
            "59.90",
            14,
            "ocean"
        ));
      }
    };
  }

  private CandleProduct candle(
      String name,
      String scent,
      String description,
      String price,
      int stock,
      String color
  ) {
    CandleProduct candle = new CandleProduct();
    candle.setName(name);
    candle.setScent(scent);
    candle.setDescription(description);
    candle.setPrice(new BigDecimal(price));
    candle.setStock(stock);
    candle.setColor(color);
    candle.setActive(true);
    return candle;
  }
}
