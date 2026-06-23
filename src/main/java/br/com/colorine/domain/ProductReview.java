package br.com.colorine.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.Instant;

@Entity
@Table(name = "product_reviews", uniqueConstraints = @UniqueConstraint(name = "uk_product_review_order", columnNames = {"customer_id", "product_id", "order_id"}))
public class ProductReview {
  @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;
  @ManyToOne(optional = false, fetch = FetchType.LAZY)
  private UserAccount customer;
  @ManyToOne(optional = false, fetch = FetchType.LAZY)
  private CandleProduct product;
  @ManyToOne(optional = false, fetch = FetchType.LAZY)
  private CustomerOrder order;
  @Column(nullable = false)
  private int rating;
  @Column(nullable = false, length = 280)
  private String comment;
  @Column(nullable = false)
  private Instant createdAt = Instant.now();

  public Long getId() { return id; }
  public UserAccount getCustomer() { return customer; }
  public void setCustomer(UserAccount customer) { this.customer = customer; }
  public CandleProduct getProduct() { return product; }
  public void setProduct(CandleProduct product) { this.product = product; }
  public CustomerOrder getOrder() { return order; }
  public void setOrder(CustomerOrder order) { this.order = order; }
  public int getRating() { return rating; }
  public void setRating(int rating) { this.rating = rating; }
  public String getComment() { return comment; }
  public void setComment(String comment) { this.comment = comment; }
  public Instant getCreatedAt() { return createdAt; }
}
