
package com.subscribeiq.backend.controller;

import com.subscribeiq.backend.entity.Payment;
import com.subscribeiq.backend.service.PaymentService;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/payments")
@CrossOrigin(origins = "*")
public class PaymentController {

    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    // GET ALL PAYMENTS
    @GetMapping
    public List<Payment> getAllPayments() {
        return paymentService.getAllPayments();
    }

    // GET PAYMENT BY ID
    @GetMapping("/{id}")
    public Payment getPaymentById(@PathVariable Integer id) {
        return paymentService.getPaymentById(id);
    }

    // CREATE PAYMENT
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Payment createPayment(@RequestBody Payment payment) {
        return paymentService.createPayment(payment);
    }

    // UPDATE PAYMENT
    @PutMapping("/{id}")
    public Payment updatePayment(
            @PathVariable Integer id,
            @RequestBody Payment payment) {

        return paymentService.updatePayment(id, payment);
    }

    // REVERSE PAYMENT / SOFT DELETE
    @DeleteMapping("/{id}")
    public Payment reversePayment(@PathVariable Integer id) {
        return paymentService.reversePayment(id);
    }
}
