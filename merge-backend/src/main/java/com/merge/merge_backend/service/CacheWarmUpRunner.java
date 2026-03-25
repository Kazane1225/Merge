package com.merge.merge_backend.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

/**
 * Triggers cache warm-up for both Dev.to and Qiita once the application is fully started.
 * Using @Async here (called via Spring's event proxy) avoids blocking the startup thread,
 * replacing the manual Thread creation that was previously in both service @PostConstruct methods.
 */
@Component
public class CacheWarmUpRunner {

    private static final Logger log = LoggerFactory.getLogger(CacheWarmUpRunner.class);

    private final DevService devService;
    private final QiitaService qiitaService;

    public CacheWarmUpRunner(DevService devService, QiitaService qiitaService) {
        this.devService = devService;
        this.qiitaService = qiitaService;
    }

    @Async
    @EventListener(ApplicationReadyEvent.class)
    public void warmUpCaches() {
        log.info("[WarmUp] Starting cache warm-up");
        devService.warmUp();
        qiitaService.warmUp();
        log.info("[WarmUp] Cache warm-up complete");
    }
}
