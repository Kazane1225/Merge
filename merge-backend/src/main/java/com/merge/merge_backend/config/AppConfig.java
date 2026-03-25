package com.merge.merge_backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;

import java.time.Clock;
import java.util.concurrent.Executor;

@Configuration
@EnableAsync
@EnableConfigurationProperties({ DevProperties.class, QiitaProperties.class })
public class AppConfig {

    private static final String USER_AGENT =
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";

    @Bean("devRestClient")
    public RestClient devRestClient(@Value("${dev.access.token:}") String devApiKey) {
        RestClient.Builder builder = RestClient.builder()
                .defaultHeader(HttpHeaders.USER_AGENT, USER_AGENT);
        if (StringUtils.hasText(devApiKey)) {
            builder.defaultHeader("api-key", devApiKey);
        }
        return builder.build();
    }

    @Bean("qiitaRestClient")
    public RestClient qiitaRestClient(@Value("${qiita.access.token:}") String qiitaToken) {
        RestClient.Builder builder = RestClient.builder()
                .defaultHeader(HttpHeaders.USER_AGENT, USER_AGENT);
        if (StringUtils.hasText(qiitaToken)) {
            builder.defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + qiitaToken);
        }
        return builder.build();
    }

    @Bean
    public Clock clock() {
        return Clock.systemDefaultZone();
    }

    @Bean
    public Executor taskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(5);
        executor.setQueueCapacity(25);
        executor.setThreadNamePrefix("cache-warmup-");
        executor.initialize();
        return executor;
    }
}
