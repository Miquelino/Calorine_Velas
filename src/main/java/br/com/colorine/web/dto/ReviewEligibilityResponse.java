package br.com.colorine.web.dto;

import java.time.Instant;

public record ReviewEligibilityResponse(Long orderId, Long productId, String productName, Instant requestedAt) {
}
