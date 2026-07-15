package br.com.colorine.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
public class DiscountCoupon {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false, unique = true, length = 30)
  private String code;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20)
  private CouponType type;

  @Column(name = "coupon_value", nullable = false, precision = 10, scale = 2)
  private BigDecimal value = BigDecimal.ZERO;

  @Column(nullable = false, precision = 10, scale = 2)
  private BigDecimal minimumSubtotal = BigDecimal.ZERO;

  private Integer usageLimit;

  @Column(nullable = false)
  private int usedCount;

  private LocalDate validUntil;

  @Column(nullable = false)
  private boolean active = true;

  public Long getId() { return id; }
  public void setId(Long id) { this.id = id; }
  public String getCode() { return code; }
  public void setCode(String code) { this.code = code; }
  public CouponType getType() { return type; }
  public void setType(CouponType type) { this.type = type; }
  public BigDecimal getValue() { return value; }
  public void setValue(BigDecimal value) { this.value = value; }
  public BigDecimal getMinimumSubtotal() { return minimumSubtotal; }
  public void setMinimumSubtotal(BigDecimal minimumSubtotal) { this.minimumSubtotal = minimumSubtotal; }
  public Integer getUsageLimit() { return usageLimit; }
  public void setUsageLimit(Integer usageLimit) { this.usageLimit = usageLimit; }
  public int getUsedCount() { return usedCount; }
  public void setUsedCount(int usedCount) { this.usedCount = usedCount; }
  public LocalDate getValidUntil() { return validUntil; }
  public void setValidUntil(LocalDate validUntil) { this.validUntil = validUntil; }
  public boolean isActive() { return active; }
  public void setActive(boolean active) { this.active = active; }
}
