package br.com.colorine.service;

import br.com.colorine.domain.CouponType;
import br.com.colorine.domain.DiscountCoupon;
import br.com.colorine.repository.DiscountCouponRepository;
import br.com.colorine.web.dto.CouponRequest;
import br.com.colorine.web.dto.CouponResponse;
import br.com.colorine.web.dto.CouponValidationResponse;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CouponService {

  private final DiscountCouponRepository coupons;

  public CouponService(DiscountCouponRepository coupons) {
    this.coupons = coupons;
  }

  @Transactional(readOnly = true)
  public List<CouponResponse> list() {
    return coupons.findAll().stream().map(this::toResponse).toList();
  }

  @Transactional
  public CouponResponse create(CouponRequest request) {
    String code = normalizeCode(request.code());
    if (coupons.existsByCodeIgnoreCase(code)) {
      throw new IllegalArgumentException("Ja existe um cupom com esse codigo.");
    }
    DiscountCoupon coupon = new DiscountCoupon();
    applyRequest(coupon, request, code);
    return toResponse(coupons.save(coupon));
  }

  @Transactional
  public CouponResponse update(Long id, CouponRequest request) {
    DiscountCoupon coupon = coupons.findById(id)
        .orElseThrow(() -> new IllegalArgumentException("Cupom nao encontrado."));
    String code = normalizeCode(request.code());
    coupons.findByCodeIgnoreCase(code)
        .filter(existing -> !existing.getId().equals(id))
        .ifPresent(existing -> { throw new IllegalArgumentException("Ja existe um cupom com esse codigo."); });
    applyRequest(coupon, request, code);
    return toResponse(coupon);
  }

  @Transactional(readOnly = true)
  public CouponValidationResponse validate(String code, BigDecimal subtotal, BigDecimal shippingCost) {
    String normalized = normalizeCode(code);
    if (normalized.isBlank()) {
      return invalid("", "Informe um cupom.", BigDecimal.ZERO);
    }
    DiscountCoupon coupon = coupons.findByCodeIgnoreCase(normalized).orElse(null);
    if (coupon == null || !coupon.isActive()) {
      return invalid(normalized, "Cupom nao encontrado ou inativo.", BigDecimal.ZERO);
    }
    if (coupon.getValidUntil() != null && coupon.getValidUntil().isBefore(LocalDate.now())) {
      return invalid(normalized, "Cupom vencido.", BigDecimal.ZERO);
    }
    if (coupon.getUsageLimit() != null && coupon.getUsedCount() >= coupon.getUsageLimit()) {
      return invalid(normalized, "Cupom atingiu o limite de uso.", BigDecimal.ZERO);
    }
    BigDecimal safeSubtotal = money(subtotal);
    if (safeSubtotal.compareTo(coupon.getMinimumSubtotal()) < 0) {
      return invalid(normalized, "Valor minimo para este cupom: " + coupon.getMinimumSubtotal(), BigDecimal.ZERO);
    }
    BigDecimal shipping = money(shippingCost);
    BigDecimal discount = switch (coupon.getType()) {
      case PERCENTAGE -> safeSubtotal.multiply(coupon.getValue()).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
      case FIXED_AMOUNT -> coupon.getValue().min(safeSubtotal);
      case FREE_SHIPPING -> BigDecimal.ZERO;
    };
    BigDecimal shippingDiscount = coupon.getType() == CouponType.FREE_SHIPPING ? shipping : BigDecimal.ZERO;
    return new CouponValidationResponse(
        coupon.getCode(),
        true,
        coupon.getType() == CouponType.FREE_SHIPPING ? "Frete gratis aplicado." : "Cupom aplicado.",
        money(discount),
        money(shippingDiscount),
        coupon.getType() == CouponType.FREE_SHIPPING
    );
  }

  @Transactional
  public void registerUse(String code) {
    String normalized = normalizeCode(code);
    if (normalized.isBlank()) return;
    coupons.findByCodeIgnoreCase(normalized).ifPresent(coupon -> coupon.setUsedCount(coupon.getUsedCount() + 1));
  }

  private void applyRequest(DiscountCoupon coupon, CouponRequest request, String code) {
    coupon.setCode(code);
    coupon.setType(request.type());
    coupon.setValue(money(request.value()));
    coupon.setMinimumSubtotal(money(request.minimumSubtotal()));
    coupon.setUsageLimit(request.usageLimit() == null || request.usageLimit() <= 0 ? null : request.usageLimit());
    coupon.setValidUntil(request.validUntil());
    coupon.setActive(request.active() == null || request.active());
  }

  private CouponValidationResponse invalid(String code, String message, BigDecimal shippingDiscount) {
    return new CouponValidationResponse(code, false, message, BigDecimal.ZERO, shippingDiscount, false);
  }

  private CouponResponse toResponse(DiscountCoupon coupon) {
    return new CouponResponse(
        coupon.getId(), coupon.getCode(), coupon.getType(), coupon.getValue(), coupon.getMinimumSubtotal(),
        coupon.getUsageLimit(), coupon.getUsedCount(), coupon.getValidUntil(), coupon.isActive());
  }

  private String normalizeCode(String code) {
    return code == null ? "" : code.trim().toUpperCase();
  }

  private BigDecimal money(BigDecimal value) {
    return (value == null ? BigDecimal.ZERO : value).max(BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP);
  }
}
