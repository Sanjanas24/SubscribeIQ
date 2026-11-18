
package com.subscribeiq.backend.service;

import com.subscribeiq.backend.entity.Customer;
import com.subscribeiq.backend.repository.CustomerRepository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.NoSuchElementException;

@Service
public class CustomerService {

    private final CustomerRepository customerRepository;

    @PersistenceContext
    private EntityManager entityManager;

    public CustomerService(CustomerRepository customerRepository) {
        this.customerRepository = customerRepository;
    }

    // 1. Get all customers
    public List<Customer> getAllCustomers() {
        return customerRepository.findAll();
    }

    // 2. Get customer by ID
    public Customer getCustomerById(Integer id) {
        return customerRepository.findById(id)
                .orElseThrow(() ->
                        new NoSuchElementException(
                                "Customer not found with ID: " + id
                        )
                );
    }

    // 3. Create a new customer
    @Transactional
    public Customer createCustomer(Customer customer) {

        // Generate the next customer ID
        Integer nextId = customerRepository.findAll()
                .stream()
                .map(Customer::getCustomerId)
                .filter(id -> id != null)
                .max(Integer::compareTo)
                .orElse(0) + 1;

        customer.setCustomerId(nextId);

        // Insert customer directly into MySQL
        entityManager.createNativeQuery(
                        "INSERT INTO customers " +
                                "(customer_id, full_name, email, phone, city, state, " +
                                "registration_date, customer_status) " +
                                "VALUES (:id, :name, :email, :phone, :city, :state, :date, :status)"
                )
                .setParameter("id", nextId)
                .setParameter("name", customer.getFullName())
                .setParameter("email", customer.getEmail())
                .setParameter("phone", customer.getPhone())
                .setParameter("city", customer.getCity())
                .setParameter("state", customer.getState())
                .setParameter("date", customer.getRegistrationDate())
                .setParameter("status", customer.getCustomerStatus())
                .executeUpdate();

        return customer;
    }

    // 4. Update an existing customer
    @Transactional
    public Customer updateCustomer(Integer id, Customer customer) {

        Customer existingCustomer = getCustomerById(id);

        existingCustomer.setFullName(customer.getFullName());
        existingCustomer.setEmail(customer.getEmail());
        existingCustomer.setPhone(customer.getPhone());
        existingCustomer.setCity(customer.getCity());
        existingCustomer.setState(customer.getState());
        existingCustomer.setRegistrationDate(customer.getRegistrationDate());
        existingCustomer.setCustomerStatus(customer.getCustomerStatus());

        return customerRepository.save(existingCustomer);
    }

    // 5. Delete customer safely (Soft Delete)
    @Transactional
    public void deleteCustomer(Integer id) {

        Customer existingCustomer = getCustomerById(id);

        existingCustomer.setCustomerStatus("INACTIVE");

        customerRepository.save(existingCustomer);
    }
}
