package br.com.colorine.config;

import br.com.colorine.domain.CandleProduct;
import br.com.colorine.domain.CouponType;
import br.com.colorine.domain.DiscountCoupon;
import br.com.colorine.domain.UserAccount;
import br.com.colorine.domain.UserRole;
import br.com.colorine.repository.CandleProductRepository;
import br.com.colorine.repository.DiscountCouponRepository;
import br.com.colorine.repository.UserAccountRepository;
import java.math.BigDecimal;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
@Profile("!prod")
public class DataInitializer {

  @Bean
  CommandLineRunner seedData(
      UserAccountRepository users,
      CandleProductRepository candles,
      DiscountCouponRepository coupons,
      PasswordEncoder passwordEncoder,
      @Value("${app.admin.email:admin@calorine.com}") String adminEmail,
      @Value("${app.admin.password:admin123}") String adminPassword
  ) {
    return args -> {
      String email = adminEmail.trim().toLowerCase();
      if (!users.existsByEmail(email)) {
        UserAccount admin = new UserAccount();
        admin.setName("Administradora Calorine");
        admin.setEmail(email);
        admin.setPhone("");
        admin.setRole(UserRole.ADMIN);
        admin.setPasswordHash(passwordEncoder.encode(adminPassword));
        users.save(admin);
      }

      if (candles.count() == 0) {
        candles.save(candle("Brisa de Lavanda", "Lavanda e alecrim", "Vela calmante em pote de vidro, ideal para banho relaxante ou leitura no fim do dia.", "54.90", 18, "sage", "120g", "classica", "relaxante"));
        candles.save(candle("Doce Baunilha", "Baunilha e tonka", "Aroma acolhedor e cremoso, feito para deixar a casa com cheiro de sobremesa elegante.", "49.90", 24, "honey", "120g", "classica", "aconchegante"));
        candles.save(candle("Figo Rosado", "Figo, rosas e madeira", "Uma vela marcante para presente, com perfume floral frutado e acabamento artesanal.", "64.90", 10, "rose", "250g", "presente", "aconchegante"));
        candles.save(candle("Mar de Linho", "Algodao, sal e cedro", "Fresca e limpa, perfeita para sala, lavabo e ambientes que pedem leveza.", "59.90", 14, "ocean", "250g", "classica", "relaxante"));
      }

      if (!coupons.existsByCodeIgnoreCase("CALORINE10")) {
        coupons.save(coupon("CALORINE10", CouponType.PERCENTAGE, "10.00", "0.00"));
      }
      if (!coupons.existsByCodeIgnoreCase("FRETEGRATIS")) {
        coupons.save(coupon("FRETEGRATIS", CouponType.FREE_SHIPPING, "0.00", "180.00"));
      }
    };
  }

  private CandleProduct candle(String name, String scent, String description, String price, int stock, String color, String size, String occasion, String mood) {
    CandleProduct candle = new CandleProduct();
    candle.setName(name);
    candle.setScent(scent);
    candle.setDescription(description);
    candle.setPrice(new BigDecimal(price));
    candle.setStock(stock);
    candle.setMinimumStock(5);
    candle.setColor(color);
    candle.setSize(size);
    candle.setOccasion(occasion);
    candle.setMood(mood);
    candle.setActive(true);
    return candle;
  }

  private DiscountCoupon coupon(String code, CouponType type, String value, String minimumSubtotal) {
    DiscountCoupon coupon = new DiscountCoupon();
    coupon.setCode(code);
    coupon.setType(type);
    coupon.setValue(new BigDecimal(value));
    coupon.setMinimumSubtotal(new BigDecimal(minimumSubtotal));
    coupon.setActive(true);
    return coupon;
  }
}
