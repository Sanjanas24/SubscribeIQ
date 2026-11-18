
package com.subscribeiq.backend.controller;

import com.subscribeiq.backend.entity.Subscription;
import com.subscribeiq.backend.service.SubscriptionService;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/subscriptions")
@CrossOrigin(origins = "*")
public class SubscriptionController {

    private final SubscriptionService subscriptionService;

    public SubscriptionController(
            SubscriptionService subscriptionService) {
        this.subscriptionService = subscriptionService;
    }

    // GET all subscriptions
    @GetMapping
    public List<Subscription> getAllSubscriptions() {
        return subscriptionService.getAllSubscriptions();
    }

    // GET subscription by ID
    @GetMapping("/{id}")
    public Subscription getSubscriptionById(
            @PathVariable Integer id) {
        return subscriptionService.getSubscriptionById(id);
    }

    // POST create subscription
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Subscription createSubscription(
            @RequestBody Subscription subscription) {
        return subscriptionService.createSubscription(subscription);
    }

    // PUT update subscription
    @PutMapping("/{id}")
    public Subscription updateSubscription(
            @PathVariable Integer id,
            @RequestBody Subscription subscription) {
        return subscriptionService.updateSubscription(id, subscription);
    }

    // DELETE means cancel, not physically delete
    @DeleteMapping("/{id}")
    public Subscription cancelSubscription(
            @PathVariable Integer id) {
        return subscriptionService.cancelSubscription(id);
    }
}
