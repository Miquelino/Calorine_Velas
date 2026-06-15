package br.com.colorine.service;

import br.com.colorine.domain.UserAccount;
import br.com.colorine.domain.UserRole;
import br.com.colorine.repository.UserAccountRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

@Service
public class SecurityService {

  private final UserAccountRepository users;

  public SecurityService(UserAccountRepository users) {
    this.users = users;
  }

  public UserAccount currentUser(Authentication authentication) {
    if (authentication == null || !authentication.isAuthenticated()) {
      throw new AccessDeniedException("Login necessario.");
    }

    return users.findByEmail(authentication.getName().trim().toLowerCase())
        .orElseThrow(() -> new AccessDeniedException("Usuario autenticado nao encontrado."));
  }

  public boolean isAdmin(UserAccount user) {
    return user.getRole() == UserRole.ADMIN;
  }

  public void requireSameUserOrAdmin(UserAccount user, Long customerId) {
    if (!isAdmin(user) && !user.getId().equals(customerId)) {
      throw new AccessDeniedException("Voce nao tem permissao para acessar este recurso.");
    }
  }
}
