package com.merge.merge_backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

@SpringBootApplication
@EnableJpaAuditing
public class MergeBackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(MergeBackendApplication.class, args);
	}

}
