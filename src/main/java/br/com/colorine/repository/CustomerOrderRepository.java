package br.com.colorine.repository;

import br.com.colorine.domain.CustomerOrder;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CustomerOrderRepository extends JpaRepository<CustomerOrder, Long> {
  List<CustomerOrder> findByCustomerIdOrderByCreatedAtDesc(Long customerId);

  List<CustomerOrder> findAllByOrderByCreatedAtDesc();
}
