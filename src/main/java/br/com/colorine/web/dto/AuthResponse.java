package br.com.colorine.web.dto;

import br.com.colorine.domain.UserRole;

public record AuthResponse(
    Long id,
    String name,
    String email,
    String phone,
    AddressResponse address,
    UserRole role
) {
}