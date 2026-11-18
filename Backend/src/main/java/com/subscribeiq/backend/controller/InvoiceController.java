
package com.subscribeiq.backend.controller;

import com.subscribeiq.backend.entity.Invoice;
import com.subscribeiq.backend.service.InvoiceService;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/invoices")
@CrossOrigin(origins = "*")
public class InvoiceController {

    private final InvoiceService invoiceService;

    public InvoiceController(InvoiceService invoiceService) {
        this.invoiceService = invoiceService;
    }

    // GET ALL INVOICES
    @GetMapping
    public List<Invoice> getAllInvoices() {
        return invoiceService.getAllInvoices();
    }

    // GET INVOICE BY ID
    @GetMapping("/{id}")
    public Invoice getInvoiceById(@PathVariable Integer id) {
        return invoiceService.getInvoiceById(id);
    }

    // CREATE INVOICE
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Invoice createInvoice(@RequestBody Invoice invoice) {
        return invoiceService.createInvoice(invoice);
    }

    // UPDATE INVOICE
    @PutMapping("/{id}")
    public Invoice updateInvoice(
            @PathVariable Integer id,
            @RequestBody Invoice invoice) {

        return invoiceService.updateInvoice(id, invoice);
    }

    // SOFT DELETE / VOID INVOICE
    @DeleteMapping("/{id}")
    public Invoice voidInvoice(@PathVariable Integer id) {
        return invoiceService.voidInvoice(id);
    }
}
