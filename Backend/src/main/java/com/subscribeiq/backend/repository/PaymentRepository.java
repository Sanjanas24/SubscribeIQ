
package com.subscribeiq.backend.repository;

import com.subscribeiq.backend.entity.Payment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PaymentRepository extends JpaRepository<Payment, Integer> {

    boolean existsByPaymentReference(String paymentReference);

    boolean existsByPaymentReferenceAndPaymentIdNot(
            String paymentReference,
            Integer paymentId
    );

    List<Payment> findAllByOrderByPaymentDateDesc();
}
