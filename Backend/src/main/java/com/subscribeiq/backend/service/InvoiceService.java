
package com.subscribeiq.backend.service;

import com.subscribeiq.backend.entity.Invoice;
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
public class InvoiceService {

    private final InvoiceRepository invoiceRepository;

    @PersistenceContext
    private EntityManager entityManager;

    private static final Set<String> ALLOWED_STATUSES = Set.of(
            "UNPAID",
            "PAID",
            "PARTIALLY_PAID",
            "OVERDUE",
            "VOID"
    );

    public InvoiceService(InvoiceRepository invoiceRepository) {
        this.invoiceRepository = invoiceRepository;
    }

    // GET ALL INVOICES
    public List<Invoice> getAllInvoices() {
        return invoiceRepository.findAllByOrderByInvoiceDateDesc();
    }

    // GET INVOICE BY ID
    public Invoice getInvoiceById(Integer id) {
        return invoiceRepository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException("Invoice not found with ID: " + id));
    }

    // CREATE INVOICE
    @Transactional
    public Invoice createInvoice(Invoice invoice) {

        validateInvoice(invoice);

        if (invoiceRepository.existsByInvoiceNumber(invoice.getInvoiceNumber())) {
            throw new IllegalArgumentException("Invoice number already exists");
        }

        validateCustomerAndSubscription(
                invoice.getCustomerId(),
                invoice.getSubscriptionId()
        );

        Number maxId = (Number) entityManager.createNativeQuery(
                "SELECT COALESCE(MAX(invoice_id), 0) FROM invoices"
        ).getSingleResult();

        int nextId = maxId.intValue() + 1;

        entityManager.createNativeQuery(
                        "INSERT INTO invoices (" +
                                "invoice_id, invoice_number, subscription_id, customer_id, " +
                                "invoice_date, due_date, subtotal, discount_amount, tax_rate_percent, " +
                                "tax_amount, total_amount, amount_paid, outstanding_amount, invoice_status" +
                                ") VALUES (" +
                                ":id, :number, :subscriptionId, :customerId, " +
                                ":invoiceDate, :dueDate, :subtotal, :discount, :taxRate, " +
                                ":taxAmount, :totalAmount, :amountPaid, :outstanding, :status)"
                )
                .setParameter("id", nextId)
                .setParameter("number", invoice.getInvoiceNumber())
                .setParameter("subscriptionId", invoice.getSubscriptionId())
                .setParameter("customerId", invoice.getCustomerId())
                .setParameter("invoiceDate", invoice.getInvoiceDate())
                .setParameter("dueDate", invoice.getDueDate())
                .setParameter("subtotal", invoice.getSubtotal())
                .setParameter("discount", invoice.getDiscountAmount())
                .setParameter("taxRate", invoice.getTaxRate())
                .setParameter("taxAmount", invoice.getTaxAmount())
                .setParameter("totalAmount", invoice.getTotalAmount())
                .setParameter("amountPaid", invoice.getAmountPaid())
                .setParameter("outstanding", invoice.getOutstandingAmount())
                .setParameter("status", invoice.getInvoiceStatus())
                .executeUpdate();

        return getInvoiceById(nextId);
    }

    // UPDATE INVOICE
    @Transactional
    public Invoice updateInvoice(Integer id, Invoice updatedInvoice) {

        Invoice existingInvoice = getInvoiceById(id);

        if ("VOID".equalsIgnoreCase(existingInvoice.getInvoiceStatus())) {
            throw new IllegalArgumentException("A void invoice cannot be updated");
        }

        validateInvoice(updatedInvoice);

        boolean sameInvoiceNumber = existingInvoice.getInvoiceNumber()
                .equalsIgnoreCase(updatedInvoice.getInvoiceNumber());

        if (!sameInvoiceNumber &&
                invoiceRepository.existsByInvoiceNumber(
                        updatedInvoice.getInvoiceNumber())) {

            throw new IllegalArgumentException("Invoice number already exists");
        }

        validateCustomerAndSubscription(
                updatedInvoice.getCustomerId(),
                updatedInvoice.getSubscriptionId()
        );

        existingInvoice.setInvoiceNumber(updatedInvoice.getInvoiceNumber());
        existingInvoice.setSubscriptionId(updatedInvoice.getSubscriptionId());
        existingInvoice.setCustomerId(updatedInvoice.getCustomerId());
        existingInvoice.setInvoiceDate(updatedInvoice.getInvoiceDate());
        existingInvoice.setDueDate(updatedInvoice.getDueDate());
        existingInvoice.setSubtotal(updatedInvoice.getSubtotal());
        existingInvoice.setDiscountAmount(updatedInvoice.getDiscountAmount());
        existingInvoice.setTaxRate(updatedInvoice.getTaxRate());
        existingInvoice.setTaxAmount(updatedInvoice.getTaxAmount());
        existingInvoice.setTotalAmount(updatedInvoice.getTotalAmount());
        existingInvoice.setAmountPaid(updatedInvoice.getAmountPaid());
        existingInvoice.setOutstandingAmount(updatedInvoice.getOutstandingAmount());
        existingInvoice.setInvoiceStatus(updatedInvoice.getInvoiceStatus());

        return invoiceRepository.save(existingInvoice);
    }

    // SOFT DELETE / VOID INVOICE
    @Transactional
    public Invoice voidInvoice(Integer id) {

        Invoice invoice = getInvoiceById(id);

        if ("VOID".equalsIgnoreCase(invoice.getInvoiceStatus())) {
            throw new IllegalArgumentException("Invoice is already void");
        }

        if (invoice.getAmountPaid().compareTo(BigDecimal.ZERO) > 0) {
            throw new IllegalArgumentException(
                    "Cannot void an invoice with successful payments. " +
                            "Reverse all successful payments first."
            );
        }

        invoice.setInvoiceStatus("VOID");

        return invoiceRepository.save(invoice);
    }

    // VALIDATE INVOICE DATA
    private void validateInvoice(Invoice invoice) {

        if (invoice == null) {
            throw new IllegalArgumentException("Invoice data is required");
        }

        if (invoice.getInvoiceNumber() == null
                || invoice.getInvoiceNumber().isBlank()) {

            throw new IllegalArgumentException("Invoice number is required");
        }

        if (invoice.getInvoiceNumber().length() > 30) {
            throw new IllegalArgumentException(
                    "Invoice number cannot exceed 30 characters"
            );
        }

        if (invoice.getCustomerId() == null
                || invoice.getSubscriptionId() == null) {

            throw new IllegalArgumentException(
                    "Customer ID and Subscription ID are required"
            );
        }

        if (invoice.getInvoiceDate() == null
                || invoice.getDueDate() == null) {

            throw new IllegalArgumentException(
                    "Invoice date and due date are required"
            );
        }

        if (invoice.getSubtotal() == null
                || invoice.getDiscountAmount() == null
                || invoice.getTaxRate() == null
                || invoice.getTaxAmount() == null
                || invoice.getTotalAmount() == null
                || invoice.getAmountPaid() == null
                || invoice.getOutstandingAmount() == null) {

            throw new IllegalArgumentException(
                    "All invoice amount fields are required"
            );
        }

        if (invoice.getSubtotal().signum() < 0
                || invoice.getDiscountAmount().signum() < 0
                || invoice.getTaxRate().signum() < 0
                || invoice.getTaxAmount().signum() < 0
                || invoice.getTotalAmount().signum() < 0
                || invoice.getAmountPaid().signum() < 0
                || invoice.getOutstandingAmount().signum() < 0) {

            throw new IllegalArgumentException(
                    "Invoice amounts cannot be negative"
            );
        }

        if (invoice.getAmountPaid().compareTo(invoice.getTotalAmount()) > 0) {
            throw new IllegalArgumentException(
                    "Amount paid cannot exceed total amount"
            );
        }

        if (invoice.getOutstandingAmount().compareTo(
                invoice.getTotalAmount().subtract(invoice.getAmountPaid())) != 0) {
            throw new IllegalArgumentException(
                    "Outstanding amount must equal total amount minus amount paid"
            );
        }

        String status = invoice.getInvoiceStatus();

        if (status == null || status.isBlank()) {
            throw new IllegalArgumentException("Invoice status is required");
        }

        status = status.trim().toUpperCase(Locale.ROOT);

        if (!ALLOWED_STATUSES.contains(status)) {
            throw new IllegalArgumentException(
                    "Invalid invoice status. Allowed values: " + ALLOWED_STATUSES
            );
        }

        invoice.setInvoiceStatus(status);
        invoice.setInvoiceNumber(invoice.getInvoiceNumber().trim());
    }

    // VALIDATE CUSTOMER AND SUBSCRIPTION
    private void validateCustomerAndSubscription(
            Integer customerId,
            Integer subscriptionId) {

        Number customerCount = (Number) entityManager.createNativeQuery(
                        "SELECT COUNT(*) FROM customers WHERE customer_id = :customerId"
                )
                .setParameter("customerId", customerId)
                .getSingleResult();

        if (customerCount.intValue() == 0) {
            throw new IllegalArgumentException("Customer does not exist");
        }

        Number subscriptionCount = (Number) entityManager.createNativeQuery(
                        "SELECT COUNT(*) FROM subscriptions " +
                                "WHERE subscription_id = :subscriptionId " +
                                "AND customer_id = :customerId"
                )
                .setParameter("subscriptionId", subscriptionId)
                .setParameter("customerId", customerId)
                .getSingleResult();

        if (subscriptionCount.intValue() == 0) {
            throw new IllegalArgumentException(
                    "Subscription does not exist or does not belong to this customer"
            );
        }
    }
}
