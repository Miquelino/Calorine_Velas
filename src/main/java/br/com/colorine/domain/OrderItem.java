package br.com.colorine.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToOne;
import java.math.BigDecimal;

@Entity
public class OrderItem {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(optional = false, fetch = FetchType.LAZY)
  private CustomerOrder order;

  @ManyToOne(optional = false, fetch = FetchType.LAZY)
  private CandleProduct product;

  @Column(nullable = false)
  private int quantity;

  @Column(nullable = false, precision = 10, scale = 2)
  private BigDecimal unitPrice;

  public Long getId() { return id; }
  public void setId(Long id) { this.id = id; }
  public CustomerOrder getOrder() { return order; }
  public void setOrder(CustomerOrder order) { this.order = order; }
  public CandleProduct getProduct() { return product; }
  public void setProduct(CandleProduct product) { this.product = product; }
  public int getQuantity() { return quantity; }
  public void setQuantity(int quantity) { this.quantity = quantity; }
  public BigDecimal getUnitPrice() { return unitPrice; }
  public void setUnitPrice(BigDecimal unitPrice) { this.unitPrice = unitPrice; }
}
