package br.com.colorine.domain;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "customer_orders")
public class CustomerOrder {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(optional = false, fetch = FetchType.LAZY)
  private UserAccount customer;

  @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
  private List<OrderItem> items = new ArrayList<>();

  @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
  private List<OrderEvent> events = new ArrayList<>();

  @Column(nullable = false, length = 160)
  private String deliveryAddress;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 30)
  private PaymentMethod paymentMethod;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 30)
  private PaymentStatus paymentStatus = PaymentStatus.PENDING;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 30)
  private OrderStatus status = OrderStatus.CREATED;

  @Column(nullable = false, precision = 10, scale = 2)
  private BigDecimal total = BigDecimal.ZERO;

  @Column(length = 30)
  private String couponCode;

  @Column(nullable = false, precision = 10, scale = 2)
  private BigDecimal discountTotal = BigDecimal.ZERO;

  @Column(length = 12)
  private String shippingCep;

  @Column(length = 30)
  private String shippingService;

  @Column(nullable = false, precision = 10, scale = 2)
  private BigDecimal shippingCost = BigDecimal.ZERO;

  private Integer shippingDays;

  @Column(length = 30)
  private String paymentSimulation;

  @Column(length = 220)
  private String emailNotification;

  private Instant reviewRequestedAt;

  @Column(length = 220)
  private String reviewNotification;

  @Column(nullable = false)
  private Instant createdAt = Instant.now();

  public Long getId() { return id; }
  public void setId(Long id) { this.id = id; }
  public UserAccount getCustomer() { return customer; }
  public void setCustomer(UserAccount customer) { this.customer = customer; }
  public List<OrderItem> getItems() { return items; }
  public void setItems(List<OrderItem> items) { this.items = items; }
  public List<OrderEvent> getEvents() { return events; }
  public void setEvents(List<OrderEvent> events) { this.events = events; }
  public String getDeliveryAddress() { return deliveryAddress; }
  public void setDeliveryAddress(String deliveryAddress) { this.deliveryAddress = deliveryAddress; }
  public PaymentMethod getPaymentMethod() { return paymentMethod; }
  public void setPaymentMethod(PaymentMethod paymentMethod) { this.paymentMethod = paymentMethod; }
  public PaymentStatus getPaymentStatus() { return paymentStatus; }
  public void setPaymentStatus(PaymentStatus paymentStatus) { this.paymentStatus = paymentStatus; }
  public OrderStatus getStatus() { return status; }
  public void setStatus(OrderStatus status) { this.status = status; }
  public BigDecimal getTotal() { return total; }
  public void setTotal(BigDecimal total) { this.total = total; }
  public String getCouponCode() { return couponCode; }
  public void setCouponCode(String couponCode) { this.couponCode = couponCode; }
  public BigDecimal getDiscountTotal() { return discountTotal; }
  public void setDiscountTotal(BigDecimal discountTotal) { this.discountTotal = discountTotal; }
  public String getShippingCep() { return shippingCep; }
  public void setShippingCep(String shippingCep) { this.shippingCep = shippingCep; }
  public String getShippingService() { return shippingService; }
  public void setShippingService(String shippingService) { this.shippingService = shippingService; }
  public BigDecimal getShippingCost() { return shippingCost; }
  public void setShippingCost(BigDecimal shippingCost) { this.shippingCost = shippingCost; }
  public Integer getShippingDays() { return shippingDays; }
  public void setShippingDays(Integer shippingDays) { this.shippingDays = shippingDays; }
  public String getPaymentSimulation() { return paymentSimulation; }
  public void setPaymentSimulation(String paymentSimulation) { this.paymentSimulation = paymentSimulation; }
  public String getEmailNotification() { return emailNotification; }
  public void setEmailNotification(String emailNotification) { this.emailNotification = emailNotification; }
  public Instant getReviewRequestedAt() { return reviewRequestedAt; }
  public void setReviewRequestedAt(Instant reviewRequestedAt) { this.reviewRequestedAt = reviewRequestedAt; }
  public String getReviewNotification() { return reviewNotification; }
  public void setReviewNotification(String reviewNotification) { this.reviewNotification = reviewNotification; }
  public Instant getCreatedAt() { return createdAt; }
  public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

  public void addItem(OrderItem item) {
    items.add(item);
    item.setOrder(this);
  }

  public void addEvent(String title, String description) {
    OrderEvent event = new OrderEvent();
    event.setTitle(title);
    event.setDescription(description);
    event.setOrder(this);
    events.add(event);
  }
}
