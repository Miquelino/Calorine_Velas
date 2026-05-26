package br.com.colorine.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

@Configuration
public class DatabaseMigration {

  @Bean
  CommandLineRunner removeLegacyUserAddressColumn(JdbcTemplate jdbcTemplate) {
    return args -> jdbcTemplate.execute("ALTER TABLE users DROP COLUMN IF EXISTS address");
  }
}