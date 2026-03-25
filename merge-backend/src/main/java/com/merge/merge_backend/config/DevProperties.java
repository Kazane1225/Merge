package com.merge.merge_backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.HashMap;
import java.util.Map;

/**
 * Externalized configuration for Dev.to API per-period settings.
 * Defaults are coded here; override any value in application.properties via:
 *   dev.periods.week.pages=5
 *   dev.periods.week.min-reactions=10
 *   dev.periods.week.ttl-seconds=1800
 */
@ConfigurationProperties(prefix = "dev")
public class DevProperties {

    private Map<String, Period> periods = defaultPeriods();

    public Map<String, Period> getPeriods() { return periods; }
    public void setPeriods(Map<String, Period> periods) { this.periods = periods; }

    /** Returns the Period config for the given key, falling back to "week" defaults. */
    public Period getPeriod(String key) {
        return periods.getOrDefault(key, periods.getOrDefault("week", new Period(3, 5, 1800)));
    }

    private static Map<String, Period> defaultPeriods() {
        Map<String, Period> m = new HashMap<>();
        m.put("1day",  new Period(1,   0,    900));
        m.put("week",  new Period(3,   5,    1800));
        m.put("month", new Period(5,   30,   3600));
        m.put("year",  new Period(7,   150,  7200));
        m.put("all",   new Period(10,  500,  7200));
        return m;
    }

    public static class Period {
        private int pages = 3;
        private int minReactions = 5;
        private long ttlSeconds = 1800;

        public Period() {}

        public Period(int pages, int minReactions, long ttlSeconds) {
            this.pages = pages;
            this.minReactions = minReactions;
            this.ttlSeconds = ttlSeconds;
        }

        public int getPages() { return pages; }
        public void setPages(int pages) { this.pages = pages; }

        public int getMinReactions() { return minReactions; }
        public void setMinReactions(int minReactions) { this.minReactions = minReactions; }

        public long getTtlSeconds() { return ttlSeconds; }
        public void setTtlSeconds(long ttlSeconds) { this.ttlSeconds = ttlSeconds; }
    }
}
