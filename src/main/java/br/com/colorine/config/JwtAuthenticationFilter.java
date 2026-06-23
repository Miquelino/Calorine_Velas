package br.com.colorine.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

  private final JwtService jwtService;
  private final UserDetailsService users;

  public JwtAuthenticationFilter(JwtService jwtService, UserDetailsService users) {
    this.jwtService = jwtService;
    this.users = users;
  }

  @Override
  protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
      throws ServletException, IOException {
    String authorization = request.getHeader("Authorization");
    if (authorization != null && authorization.startsWith("Bearer ")) {
      String token = authorization.substring(7);
      String email = jwtService.subject(token);
      if (email != null && SecurityContextHolder.getContext().getAuthentication() == null) {
        var user = users.loadUserByUsername(email);
        var authentication = new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities());
        SecurityContextHolder.getContext().setAuthentication(authentication);
      }
    }
    chain.doFilter(request, response);
  }
}
