package br.com.colorine.service;

import br.com.colorine.domain.CandleProduct;
import br.com.colorine.domain.CustomerOrder;
import br.com.colorine.domain.OrderItem;
import br.com.colorine.domain.UserAccount;
import br.com.colorine.repository.CandleProductRepository;
import br.com.colorine.repository.CustomerOrderRepository;
import br.com.colorine.repository.UserAccountRepository;
import br.com.colorine.web.dto.OrderItemRequest;
import br.com.colorine.web.dto.OrderRequest;
import br.com.colorine.web.dto.OrderResponse;
import java.math.BigDecimal;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OrderService {

  private final CustomerOrderRepository orders;
  private final UserAccountRepository users;
  private final CandleProductRepository candles;

  public OrderService(
      CustomerOrderRepository orders,
      UserAccountRepository users,
      CandleProductRepository candles
  ) {
    this.orders = orders;
    this.users = users;
    this.candles = candles;
  }

  @Transactional
  public OrderResponse create(OrderRequest request) {
    UserAccount customer = users.findById(request.customerId())
        .orElseThrow(() -> new IllegalArgumentException("Cliente nao encontrado."));

    CustomerOrder order = new CustomerOrder();
    order.setCustomer(customer);
    order.setDeliveryAddress(request.deliveryAddress().trim());
    order.setPaymentMethod(request.paymentMethod());

    BigDecimal total = BigDecimal.ZERO;
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

      total = total.add(product.getPrice().multiply(BigDecimal.valueOf(itemRequest.quantity())));
    }

    order.setTotal(total);
    return toResponse(orders.save(order));
  }

  private OrderResponse toResponse(CustomerOrder order) {
    return new OrderResponse(
        order.getId(),
        order.getCustomer().getName(),
        order.getTotal(),
        order.getPaymentMethod(),
        order.getStatus(),
        order.getCreatedAt()
    );
  }
}
