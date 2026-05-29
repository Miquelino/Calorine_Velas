package br.com.colorine.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

@Configuration
public class DatabaseMigration {

  @Bean
  CommandLineRunner removeLegacyUserAddressColumn(JdbcTemplate jdbcTemplate) {
    return args -> {
      jdbcTemplate.execute("ALTER TABLE users DROP COLUMN IF EXISTS address");
      jdbcTemplate.execute("ALTER TABLE candle_product ADD COLUMN IF NOT EXISTS size VARCHAR(20) DEFAULT '120g' NOT NULL");
      jdbcTemplate.execute("ALTER TABLE candle_product ADD COLUMN IF NOT EXISTS occasion VARCHAR(30) DEFAULT 'classica' NOT NULL");
      jdbcTemplate.execute("ALTER TABLE candle_product ADD COLUMN IF NOT EXISTS mood VARCHAR(30) DEFAULT 'aconchegante' NOT NULL");
      jdbcTemplate.execute("ALTER TABLE candle_product ADD COLUMN IF NOT EXISTS extra_image_url_one CLOB");
      jdbcTemplate.execute("ALTER TABLE candle_product ADD COLUMN IF NOT EXISTS extra_image_url_two CLOB");
    };
  }
}
