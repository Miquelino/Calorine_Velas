package br.com.colorine.repository;

import br.com.colorine.domain.CandleProduct;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CandleProductRepository extends JpaRepository<CandleProduct, Long> {

  List<CandleProduct> findByActiveTrueOrderByName();

  List<CandleProduct> findAllByOrderByName();
}
