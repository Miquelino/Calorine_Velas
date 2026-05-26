package br.com.colorine.config;

import br.com.colorine.repository.UserAccountRepository;
import java.util.List;
import org.springframework.http.HttpMethod;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {

  @Bean
  public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
    return http
            .cors(Customizer.withDefaults())
            .csrf(csrf -> csrf.ignoringRequestMatchers("/h2-console/**", "/api/**"))
        .headers(headers -> headers.frameOptions(frame -> frame.sameOrigin()))
        .authorizeHttpRequests(auth -> auth
            .requestMatchers("/", "/index.html", "/styles.css", "/app.js", "/*.png", "/*.jpg", "/*.jpeg", "/*.webp").permitAll()
            .requestMatchers("/h2-console/**").permitAll()
            .requestMatchers(HttpMethod.OPTIONS, "/api/**").permitAll()
            .requestMatchers("/api/auth/**").permitAll()
            .requestMatchers(HttpMethodSafe.GET_CANDLES).permitAll()
            .anyRequest().authenticated()
        )
        .httpBasic(Customizer.withDefaults())
        .formLogin(form -> form.disable())
        .build();
  }

  @Bean
  public UserDetailsService userDetailsService(UserAccountRepository users) {
    return username -> users.findByEmail(username.trim().toLowerCase())
        .map(user -> new User(
            user.getEmail(),
            user.getPasswordHash(),
            List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()))
        ))
        .orElseThrow(() -> new UsernameNotFoundException("Usuario nao encontrado."));
  }

  @Bean
  public PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder();
  }

  private static final class HttpMethodSafe {
    private static final org.springframework.security.web.util.matcher.RequestMatcher GET_CANDLES =
        new org.springframework.security.web.util.matcher.AntPathRequestMatcher("/api/candles", "GET");

    private HttpMethodSafe() {
    }
  }
}
