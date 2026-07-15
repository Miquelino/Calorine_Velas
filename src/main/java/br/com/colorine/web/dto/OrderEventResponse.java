package br.com.colorine.web.dto;

import java.time.Instant;

public record OrderEventResponse(
    String title,
    String description,
    Instant createdAt
) {
}
