package br.com.colorine.service;

import br.com.colorine.domain.UserAccount;
import br.com.colorine.domain.UserRole;
import br.com.colorine.repository.UserAccountRepository;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

@Service
public class SecurityService {

  private final UserAccountRepository users;

  public SecurityService(UserAccountRepository users) {
    this.users = users;
  }

  public UserAccount currentUser(Authentication authentication) {
    if (authentication == null || authentication.getName() == null) {
      throw new IllegalArgumentException("Login necessario.");
    }
    return users.findByEmail(authentication.getName())
        .orElseThrow(() -> new IllegalArgumentException("Usuario nao encontrado."));
  }

  public void requireSameUserOrAdmin(UserAccount currentUser, Long userId) {
    if (currentUser.getRole() != UserRole.ADMIN && !currentUser.getId().equals(userId)) {
      throw new IllegalArgumentException("Voce nao pode acessar dados de outro usuario.");
    }
  }
}
