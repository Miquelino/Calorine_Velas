package br.com.colorine.web;

import br.com.colorine.service.AuthService;
import br.com.colorine.service.SecurityService;
import br.com.colorine.web.dto.AuthResponse;
import br.com.colorine.web.dto.LoginRequest;
import br.com.colorine.web.dto.PasswordChangeRequest;
import br.com.colorine.web.dto.ProfileUpdateRequest;
import br.com.colorine.web.dto.RegisterRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

  private final AuthService authService;
  private final SecurityService securityService;

  public AuthController(AuthService authService, SecurityService securityService) {
    this.authService = authService;
    this.securityService = securityService;
  }

  @PostMapping("/register")
  @ResponseStatus(HttpStatus.CREATED)
  public AuthResponse register(@Valid @RequestBody RegisterRequest request) {
    return authService.register(request);
  }

  @PostMapping("/login")
  public AuthResponse login(@Valid @RequestBody LoginRequest request) {
    return authService.login(request);
  }

  @PutMapping("/me")
  public AuthResponse updateProfile(@Valid @RequestBody ProfileUpdateRequest request, Authentication authentication) {
    return authService.updateProfile(securityService.currentUser(authentication), request);
  }

  @PutMapping("/password")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void changePassword(@Valid @RequestBody PasswordChangeRequest request, Authentication authentication) {
    authService.changePassword(securityService.currentUser(authentication), request);
  }
}
