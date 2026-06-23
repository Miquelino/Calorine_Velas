package br.com.colorine.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PasswordChangeRequest(
    @NotBlank String currentPassword,
    @NotBlank @Size(min = 6, max = 80) String newPassword
) {
}
