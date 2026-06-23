package br.com.colorine.service;

import br.com.colorine.domain.CandleProduct;
import br.com.colorine.domain.CustomerOrder;
import br.com.colorine.domain.OrderItem;
import br.com.colorine.domain.OrderStatus;
import br.com.colorine.domain.UserAccount;
import br.com.colorine.domain.UserRole;
import br.com.colorine.repository.CandleProductRepository;
import br.com.colorine.repository.CustomerOrderRepository;
import br.com.colorine.repository.ProductReviewRepository;
import br.com.colorine.repository.UserAccountRepository;
import br.com.colorine.web.dto.OrderItemRequest;
import br.com.colorine.web.dto.OrderItemResponse;
import br.com.colorine.web.dto.OrderRequest;
import br.com.colorine.web.dto.OrderResponse;
import java.math.BigDecimal;
import java.util.List;
import java.time.Instant;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OrderService {

  private final CustomerOrderRepository orders;
  private final UserAccountRepository users;
  private final CandleProductRepository candles;
  private final ProductReviewRepository reviews;

  public OrderService(CustomerOrderRepository orders, UserAccountRepository users, CandleProductRepository candles, ProductReviewRepository reviews) {
    this.orders = orders;
    this.users = users;
    this.candles = candles;
    this.reviews = reviews;
  }

  @Transactional
  public OrderResponse create(OrderRequest request, UserAccount currentUser) {
    UserAccount customer = currentUser.getRole() == UserRole.ADMIN && !currentUser.getId().equals(request.customerId())
        ? users.findById(request.customerId()).orElseThrow(() -> new IllegalArgumentException("Cliente nao encontrado."))
        : currentUser;

    CustomerOrder order = new CustomerOrder();
    order.setCustomer(customer);
    order.setStatus(OrderStatus.PENDING_PAYMENT);
    order.setDeliveryAddress(request.deliveryAddress().trim());
    order.setPaymentMethod(request.paymentMethod());
    order.setCouponCode(request.couponCode() == null ? "" : request.couponCode().trim().toUpperCase());
    order.setDiscountTotal(request.discountTotal() == null ? BigDecimal.ZERO : request.discountTotal());
    order.setShippingCep(request.shippingCep() == null ? "" : request.shippingCep().trim());
    order.setShippingService(request.shippingService() == null ? "" : request.shippingService().trim());
    order.setShippingCost(request.shippingCost() == null ? BigDecimal.ZERO : request.shippingCost());
    order.setShippingDays(request.shippingDays());
    order.setPaymentSimulation(request.paymentSimulation() == null ? "" : request.paymentSimulation().trim());

    BigDecimal subtotal = BigDecimal.ZERO;
    for (OrderItemRequest itemRequest : request.items()) {
      CandleProduct product = candles.findById(itemRequest.productId())
          .orElseThrow(() -> new IllegalArgumentException("Vela nao encontrada."));
      if (!product.isActive() || product.getStock() < itemRequest.quantity()) {
        throw new IllegalArgumentException("Estoque insuficiente para " + product.getName() + ".");
      }
      product.setStock(product.getStock() - itemRequest.quantity());

      OrderItem item = new OrderItem();
      item.setProduct(product);
      item.setQuantity(itemRequest.quantity());
      item.setUnitPrice(product.getPrice());
      order.addItem(item);
      subtotal = subtotal.add(product.getPrice().multiply(BigDecimal.valueOf(itemRequest.quantity())));
    }

    order.setTotal(subtotal.subtract(order.getDiscountTotal()).add(order.getShippingCost()).max(BigDecimal.ZERO));
    order.setEmailNotification("Pedido criado e aguardando a confirmacao do pagamento.");
    return toResponse(orders.save(order));
  }

  @Transactional
  public OrderResponse confirmPayment(Long id, UserAccount currentUser) {
    CustomerOrder order = orders.findById(id)
        .orElseThrow(() -> new IllegalArgumentException("Pedido nao encontrado."));
    if (currentUser.getRole() != UserRole.ADMIN && !order.getCustomer().getId().equals(currentUser.getId())) {
      throw new IllegalArgumentException("Este pedido nao pertence a sua conta.");
    }
    if (order.getStatus() != OrderStatus.PENDING_PAYMENT) {
      throw new IllegalArgumentException("Este pedido nao esta aguardando pagamento.");
    }
    order.setStatus(OrderStatus.PAID);
    order.setEmailNotification("Pagamento confirmado. E-mail simulado enviado para " + order.getCustomer().getEmail() + ".");
    return toResponse(order);
  }

  @Transactional(readOnly = true)
  public List<OrderResponse> listByCustomer(Long customerId) {
    if (!users.existsById(customerId)) throw new IllegalArgumentException("Cliente nao encontrado.");
    return orders.findByCustomerIdOrderByCreatedAtDesc(customerId).stream().map(this::toResponse).toList();
  }

  @Transactional(readOnly = true)
  public List<OrderResponse> listAll() {
    return orders.findAllByOrderByCreatedAtDesc().stream().map(this::toResponse).toList();
  }

  @Transactional
  public OrderResponse updateStatus(Long id, OrderStatus status) {
    CustomerOrder order = orders.findById(id)
        .orElseThrow(() -> new IllegalArgumentException("Pedido nao encontrado."));
    order.setStatus(status);
    if (status == OrderStatus.DELIVERED && order.getReviewRequestedAt() == null) {
      order.setReviewRequestedAt(Instant.now());
      order.setReviewNotification("Seu pedido foi entregue. Conte como foi sua experiencia com os produtos.");
      order.setEmailNotification("E-mail simulado enviado para " + order.getCustomer().getEmail() + " solicitando a avaliacao dos produtos entregues.");
    }
    return toResponse(order);
  }

  private OrderResponse toResponse(CustomerOrder order) {
    return new OrderResponse(
        order.getId(), order.getCustomer().getName(), order.getCustomer().getEmail(), order.getCustomer().getPhone(),
        order.getDeliveryAddress(),
        order.getItems().stream().map(item -> new OrderItemResponse(
            item.getProduct().getId(), item.getProduct().getName(), item.getQuantity(), item.getUnitPrice(),
            order.getStatus() == OrderStatus.DELIVERED
                && !reviews.existsByCustomerIdAndProductIdAndOrderId(order.getCustomer().getId(), item.getProduct().getId(), order.getId())
        )).toList(),
        order.getTotal(), order.getCouponCode(), order.getDiscountTotal(), order.getShippingCep(), order.getShippingService(),
        order.getShippingCost(), order.getShippingDays(), order.getPaymentSimulation(), order.getEmailNotification(),
        order.getPaymentMethod(), order.getStatus(), order.getReviewRequestedAt(), order.getReviewNotification(), order.getCreatedAt());
  }
}
