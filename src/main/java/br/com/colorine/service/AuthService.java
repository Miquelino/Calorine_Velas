package br.com.colorine.service;

import br.com.colorine.domain.UserAccount;
import br.com.colorine.domain.UserAddress;
import br.com.colorine.domain.UserRole;
import br.com.colorine.repository.UserAccountRepository;
import br.com.colorine.web.dto.AddressRequest;
import br.com.colorine.web.dto.AddressResponse;
import br.com.colorine.web.dto.AuthResponse;
import br.com.colorine.web.dto.LoginRequest;
import br.com.colorine.web.dto.RegisterRequest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

  private final UserAccountRepository users;
  private final PasswordEncoder passwordEncoder;

  public AuthService(UserAccountRepository users, PasswordEncoder passwordEncoder) {
    this.users = users;
    this.passwordEncoder = passwordEncoder;
  }

  @Transactional
  public AuthResponse register(RegisterRequest request) {
    String email = normalizeEmail(request.email());
    if (users.existsByEmail(email)) {
      throw new IllegalArgumentException("Ja existe uma conta com este e-mail.");
    }

    UserAccount user = new UserAccount();
    user.setName(request.name().trim());
    user.setPhone(request.phone().trim());
    user.setEmail(email);
    user.setPasswordHash(passwordEncoder.encode(request.password()));
    user.setAddress(toAddress(request.address()));
    user.setAcceptsMarketing(request.acceptsMarketing());
    user.setRole(UserRole.CUSTOMER);

    return toResponse(users.save(user));
  }

  @Transactional(readOnly = true)
  public AuthResponse login(LoginRequest request) {
    UserAccount user = users.findByEmail(normalizeEmail(request.email()))
        .orElseThrow(() -> new IllegalArgumentException("E-mail ou senha incorretos."));

    if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
      throw new IllegalArgumentException("E-mail ou senha incorretos.");
    }

    return toResponse(user);
  }

  private String normalizeEmail(String email) {
    return email.trim().toLowerCase();
  }

  private UserAddress toAddress(AddressRequest request) {
    UserAddress address = new UserAddress();
    address.setCep(request.cep().trim());
    address.setStreet(request.street().trim());
    address.setNumber(request.number().trim());
    address.setNeighborhood(request.neighborhood().trim());
    address.setComplement(request.complement() == null ? "" : request.complement().trim());
    address.setCity(request.city().trim());
    address.setState(request.state().trim().toUpperCase());
    return address;
  }

  private AuthResponse toResponse(UserAccount user) {
    return new AuthResponse(
        user.getId(),
        user.getName(),
        user.getEmail(),
        user.getPhone(),
        toAddressResponse(user.getAddress()),
        user.getRole()
    );
  }

  private AddressResponse toAddressResponse(UserAddress address) {
    if (address == null) {
      return null;
    }
    return new AddressResponse(
        address.getId(),
        address.getCep(),
        address.getStreet(),
        address.getNumber(),
        address.getNeighborhood(),
        address.getComplement(),
        address.getCity(),
        address.getState()
    );
  }
}