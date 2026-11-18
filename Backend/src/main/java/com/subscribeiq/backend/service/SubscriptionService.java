
package com.subscribeiq.backend.service;

import com.subscribeiq.backend.entity.Subscription;
import com.subscribeiq.backend.repository.SubscriptionRepository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.time.LocalDate;
import java.util.List;

@Service
public class SubscriptionService {

    private final SubscriptionRepository subscriptionRepository;

    @PersistenceContext
    private EntityManager entityManager;

    public SubscriptionService(
            SubscriptionRepository subscriptionRepository) {
        this.subscriptionRepository = subscriptionRepository;
    }

    // 1. Get all subscriptions
    public List<Subscription> getAllSubscriptions() {
        return subscriptionRepository.findAll();
    }

    // 2. Get subscription by ID
    public Subscription getSubscriptionById(Integer id) {
        return subscriptionRepository.findById(id)
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Subscription not found with ID: " + id
                        )
                );
    }

    // Check whether customer exists
    private boolean customerExists(Integer customerId) {
        Number count = (Number) entityManager.createNativeQuery(
                        "SELECT COUNT(*) FROM customers WHERE customer_id = :id"
                )
                .setParameter("id", customerId)
                .getSingleResult();

        return count.longValue() > 0;
    }

    // Check whether plan exists
    private boolean planExists(Integer planId) {
        Number count = (Number) entityManager.createNativeQuery(
                        "SELECT COUNT(*) FROM plans WHERE plan_id = :id"
                )
                .setParameter("id", planId)
                .getSingleResult();

        return count.longValue() > 0;
    }

    // 3. Create subscription
    @Transactional
    public Subscription createSubscription(Subscription subscription) {

        if (subscription.getCustomerId() == null ||
                !customerExists(subscription.getCustomerId())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Invalid customer ID"
            );
        }

        if (subscription.getPlanId() == null ||
                !planExists(subscription.getPlanId())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Invalid plan ID"
            );
        }

        if (subscription.getStartDate() == null ||
                subscription.getSubscriptionStatus() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Start date and subscription status are required"
            );
        }

        // Generate next subscription ID
        Integer nextId = subscriptionRepository.findAll()
                .stream()
                .map(Subscription::getSubscriptionId)
                .filter(id -> id != null)
                .max(Integer::compareTo)
                .orElse(0) + 1;

        subscription.setSubscriptionId(nextId);

        // Insert directly into MySQL
        entityManager.createNativeQuery(
                        "INSERT INTO subscriptions " +
                                "(subscription_id, customer_id, plan_id, start_date, " +
                                "current_period_start, current_period_end, next_billing_date, " +
                                "subscription_status, cancelled_at) " +
                                "VALUES (:id, :customerId, :planId, :startDate, " +
                                ":periodStart, :periodEnd, :billingDate, :status, :cancelledAt)"
                )
                .setParameter("id", nextId)
                .setParameter("customerId", subscription.getCustomerId())
                .setParameter("planId", subscription.getPlanId())
                .setParameter("startDate", subscription.getStartDate())
                .setParameter("periodStart", subscription.getCurrentPeriodStart())
                .setParameter("periodEnd", subscription.getCurrentPeriodEnd())
                .setParameter("billingDate", subscription.getNextBillingDate())
                .setParameter("status", subscription.getSubscriptionStatus())
                .setParameter("cancelledAt", subscription.getCancelledAt())
                .executeUpdate();

        return subscription;
    }

    // 4. Update subscription
    @Transactional
    public Subscription updateSubscription(
            Integer id, Subscription updatedSubscription) {

        Subscription existing = getSubscriptionById(id);

        if (updatedSubscription.getCustomerId() == null ||
                !customerExists(updatedSubscription.getCustomerId())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Invalid customer ID"
            );
        }

        if (updatedSubscription.getPlanId() == null ||
                !planExists(updatedSubscription.getPlanId())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Invalid plan ID"
            );
        }

        existing.setCustomerId(updatedSubscription.getCustomerId());
        existing.setPlanId(updatedSubscription.getPlanId());
        existing.setStartDate(updatedSubscription.getStartDate());
        existing.setCurrentPeriodStart(
                updatedSubscription.getCurrentPeriodStart());
        existing.setCurrentPeriodEnd(
                updatedSubscription.getCurrentPeriodEnd());
        existing.setNextBillingDate(
                updatedSubscription.getNextBillingDate());
        existing.setSubscriptionStatus(
                updatedSubscription.getSubscriptionStatus());
        existing.setCancelledAt(updatedSubscription.getCancelledAt());

        return subscriptionRepository.save(existing);
    }

    // 5. Cancel subscription without deleting its history
    @Transactional
    public Subscription cancelSubscription(Integer id) {

        Subscription existing = getSubscriptionById(id);

        existing.setSubscriptionStatus("CANCELLED");
        existing.setCancelledAt(LocalDate.now());

        return subscriptionRepository.save(existing);
    }
}
