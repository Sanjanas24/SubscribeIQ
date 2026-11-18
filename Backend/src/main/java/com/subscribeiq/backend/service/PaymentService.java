
package com.subscribeiq.backend.service;

import com.subscribeiq.backend.entity.Payment;
import com.subscribeiq.backend.entity.Invoice;
import com.subscribeiq.backend.repository.PaymentRepository;
import com.subscribeiq.backend.repository.InvoiceRepository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final InvoiceRepository invoiceRepository;

    @PersistenceContext
    private EntityManager entityManager;

    private static final Set<String> ALLOWED_STATUSES = Set.of(
            "SUCCESSFUL",
            "FAILED",
            "PENDING",
            "REVERSED"
    );

    public PaymentService(
            PaymentRepository paymentRepository,
            InvoiceRepository invoiceRepository) {

        this.paymentRepository = paymentRepository;
        this.invoiceRepository = invoiceRepository;
    }

    // GET ALL PAYMENTS
    public List<Payment> getAllPayments() {
        return paymentRepository.findAllByOrderByPaymentDateDesc();
    }

    // GET PAYMENT BY ID
    public Payment getPaymentById(Integer id) {
        return paymentRepository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException("Payment not found with ID: " + id));
    }

    // CREATE PAYMENT
    @Transactional
    public Payment createPayment(Payment payment) {

        validatePayment(payment);

        if ("REVERSED".equals(payment.getPaymentStatus())) {
            throw new IllegalArgumentException(
                    "A new payment cannot be created with REVERSED status"
            );
        }

        if (paymentRepository.existsByPaymentReference(
                payment.getPaymentReference())) {

            throw new IllegalArgumentException(
                    "Payment reference already exists"
            );
        }

        Invoice invoice = invoiceRepository.findById(payment.getInvoiceId())
                .orElseThrow(() ->
                        new IllegalArgumentException("Invoice does not exist"));

        if ("VOID".equalsIgnoreCase(invoice.getInvoiceStatus())) {
            throw new IllegalArgumentException(
                    "Cannot add a payment to a void invoice"
            );
        }

        validateInvoiceBalance(
                invoice,
                payment.getAmount(),
                payment.getPaymentStatus()
        );

        Number maxId = (Number) entityManager.createNativeQuery(
                "SELECT COALESCE(MAX(payment_id), 0) FROM payments"
        ).getSingleResult();

        int nextId = maxId.intValue() + 1;

        entityManager.createNativeQuery(
                        "INSERT INTO payments (" +
                                "payment_id, invoice_id, payment_reference, " +
                                "payment_date, amount, payment_method, " +
                                "payment_status, gateway_reference" +
                                ") VALUES (" +
                                ":id, :invoiceId, :reference, :paymentDate, " +
                                ":amount, :method, :status, :gatewayReference)"
                )
                .setParameter("id", nextId)
                .setParameter("invoiceId", payment.getInvoiceId())
                .setParameter("reference", payment.getPaymentReference())
                .setParameter("paymentDate", payment.getPaymentDate())
                .setParameter("amount", payment.getAmount())
                .setParameter("method", payment.getPaymentMethod())
                .setParameter("status", payment.getPaymentStatus())
                .setParameter("gatewayReference", payment.getGatewayReference())
                .executeUpdate();

        if ("SUCCESSFUL".equals(payment.getPaymentStatus())) {
            updateInvoiceBalance(invoice, payment.getAmount());
        }

        return getPaymentById(nextId);
    }

    // UPDATE PAYMENT
    @Transactional
    public Payment updatePayment(Integer id, Payment updatedPayment) {

        Payment existingPayment = getPaymentById(id);

        if ("REVERSED".equalsIgnoreCase(existingPayment.getPaymentStatus())) {
            throw new IllegalArgumentException(
                    "A reversed payment cannot be updated"
            );
        }

        validatePayment(updatedPayment);

        if (paymentRepository.existsByPaymentReferenceAndPaymentIdNot(
                updatedPayment.getPaymentReference(), id)) {

            throw new IllegalArgumentException(
                    "Payment reference already exists"
            );
        }

        if (!existingPayment.getInvoiceId().equals(updatedPayment.getInvoiceId())) {
            throw new IllegalArgumentException(
                    "Payment cannot be moved to another invoice"
            );
        }

        Invoice invoice = invoiceRepository.findById(existingPayment.getInvoiceId())
                .orElseThrow(() ->
                        new IllegalArgumentException("Invoice does not exist"));

        BigDecimal previousSuccessfulAmount =
                "SUCCESSFUL".equals(existingPayment.getPaymentStatus())
                        ? existingPayment.getAmount()
                        : BigDecimal.ZERO;

        BigDecimal newSuccessfulAmount =
                "SUCCESSFUL".equals(updatedPayment.getPaymentStatus())
                        ? updatedPayment.getAmount()
                        : BigDecimal.ZERO;

        BigDecimal adjustedPaidAmount = invoice.getAmountPaid()
                .subtract(previousSuccessfulAmount)
                .add(newSuccessfulAmount);

        if (adjustedPaidAmount.signum() < 0) {
            throw new IllegalArgumentException(
                    "Invalid payment adjustment"
            );
        }

        if (adjustedPaidAmount.compareTo(invoice.getTotalAmount()) > 0) {
            throw new IllegalArgumentException(
                    "Payment exceeds invoice total amount"
            );
        }

        existingPayment.setPaymentReference(
                updatedPayment.getPaymentReference());

        existingPayment.setPaymentDate(updatedPayment.getPaymentDate());
        existingPayment.setAmount(updatedPayment.getAmount());
        existingPayment.setPaymentMethod(updatedPayment.getPaymentMethod());
        existingPayment.setPaymentStatus(updatedPayment.getPaymentStatus());
        existingPayment.setGatewayReference(
                updatedPayment.getGatewayReference());

        updateInvoiceAmounts(invoice, adjustedPaidAmount);

        invoiceRepository.save(invoice);

        return paymentRepository.save(existingPayment);
    }

    // REVERSE PAYMENT / SOFT DELETE
    @Transactional
    public Payment reversePayment(Integer id) {

        Payment existingPayment = getPaymentById(id);

        if ("REVERSED".equalsIgnoreCase(existingPayment.getPaymentStatus())) {
            throw new IllegalArgumentException(
                    "Payment has already been reversed"
            );
        }

        Payment reversedPayment = new Payment();

        reversedPayment.setInvoiceId(existingPayment.getInvoiceId());
        reversedPayment.setPaymentReference(existingPayment.getPaymentReference());
        reversedPayment.setPaymentDate(existingPayment.getPaymentDate());
        reversedPayment.setAmount(existingPayment.getAmount());
        reversedPayment.setPaymentMethod(existingPayment.getPaymentMethod());
        reversedPayment.setPaymentStatus("REVERSED");
        reversedPayment.setGatewayReference(existingPayment.getGatewayReference());

        return updatePayment(id, reversedPayment);
    }

    // VALIDATE PAYMENT
    private void validatePayment(Payment payment) {

        if (payment == null) {
            throw new IllegalArgumentException("Payment data is required");
        }

        if (payment.getInvoiceId() == null) {
            throw new IllegalArgumentException("Invoice ID is required");
        }

        if (payment.getPaymentReference() == null ||
                payment.getPaymentReference().isBlank()) {

            throw new IllegalArgumentException(
                    "Payment reference is required"
            );
        }

        if (payment.getPaymentReference().length() > 30) {
            throw new IllegalArgumentException(
                    "Payment reference cannot exceed 30 characters"
            );
        }

        if (payment.getPaymentDate() == null) {
            throw new IllegalArgumentException("Payment date is required");
        }

        if (payment.getAmount() == null ||
                payment.getAmount().compareTo(BigDecimal.ZERO) <= 0) {

            throw new IllegalArgumentException(
                    "Payment amount must be greater than zero"
            );
        }

        if (payment.getPaymentMethod() == null ||
                payment.getPaymentMethod().isBlank()) {

            throw new IllegalArgumentException(
                    "Payment method is required"
            );
        }

        if (payment.getPaymentMethod().length() > 30) {
            throw new IllegalArgumentException(
                    "Payment method cannot exceed 30 characters"
            );
        }

        String status = payment.getPaymentStatus();

        if (status == null || status.isBlank()) {
            throw new IllegalArgumentException(
                    "Payment status is required"
            );
        }

        status = status.trim().toUpperCase(Locale.ROOT);

        if (!ALLOWED_STATUSES.contains(status)) {
            throw new IllegalArgumentException(
                    "Invalid payment status. Allowed values: " +
                            ALLOWED_STATUSES
            );
        }

        if (payment.getGatewayReference() != null &&
                payment.getGatewayReference().length() > 40) {

            throw new IllegalArgumentException(
                    "Gateway reference cannot exceed 40 characters"
            );
        }

        payment.setPaymentReference(payment.getPaymentReference().trim());
        payment.setPaymentStatus(status);
        payment.setPaymentMethod(payment.getPaymentMethod().trim());
    }

    // CHECK INVOICE BALANCE
    private void validateInvoiceBalance(
            Invoice invoice,
            BigDecimal amount,
            String status) {

        if ("SUCCESSFUL".equals(status)) {

            if (amount.compareTo(invoice.getOutstandingAmount()) > 0) {
                throw new IllegalArgumentException(
                        "Payment amount exceeds invoice outstanding amount"
                );
            }
        }
    }

    // UPDATE INVOICE BALANCE AFTER SUCCESSFUL PAYMENT
    private void updateInvoiceBalance(
            Invoice invoice,
            BigDecimal paymentAmount) {

        BigDecimal newPaidAmount =
                invoice.getAmountPaid().add(paymentAmount);

        updateInvoiceAmounts(invoice, newPaidAmount);

        invoiceRepository.save(invoice);
    }

    // RECALCULATE INVOICE AMOUNTS AND STATUS
    private void updateInvoiceAmounts(
            Invoice invoice,
            BigDecimal paidAmount) {

        BigDecimal outstandingAmount =
                invoice.getTotalAmount().subtract(paidAmount);

        invoice.setAmountPaid(paidAmount);
        invoice.setOutstandingAmount(outstandingAmount);

        if (outstandingAmount.compareTo(BigDecimal.ZERO) == 0) {
            invoice.setInvoiceStatus("PAID");
        } else if (paidAmount.compareTo(BigDecimal.ZERO) > 0) {
            invoice.setInvoiceStatus("PARTIALLY_PAID");
        } else {
            invoice.setInvoiceStatus("UNPAID");
        }
    }
}
