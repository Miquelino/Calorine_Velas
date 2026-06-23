package br.com.colorine.web.dto;

import java.time.Instant;

public record ReviewResponse(Long id, Long productId, String author, int rating, String comment, Instant createdAt) {
}
