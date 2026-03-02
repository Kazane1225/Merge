package com.merge.merge_backend.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

/**
 * JPA 監査設定を独立したクラスに分離することで、
 * @WebMvcTest スライステストが @EnableJpaAuditing の影響を受けないようにする。
 */
@Configuration
@EnableJpaAuditing
public class JpaAuditingConfig {
}
