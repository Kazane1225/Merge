package com.merge.merge_backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.HashMap;
import java.util.Map;

/**
 * Externalized configuration for Qiita API per-period settings.
 * Defaults are coded here; override any value in application.properties via:
 *   qiita.periods.week.pages=5
 *   qiita.periods.week.min-stocks=20
 *   qiita.periods.week.ttl-seconds=1800
 */
@ConfigurationProperties(prefix = "qiita")
public class QiitaProperties {

    private Map<String, Period> periods = defaultPeriods();

    public Map<String, Period> getPeriods() { return periods; }
    public void setPeriods(Map<String, Period> periods) { this.periods = periods; }

    /** Returns the Period config for the given key, falling back to "week" defaults. */
    public Period getPeriod(String key) {
        return periods.getOrDefault(key, periods.getOrDefault("week", new Period(3, 10, 1800)));
    }

    private static Map<String, Period> defaultPeriods() {
        Map<String, Period> m = new HashMap<>();
        m.put("1day",  new Period(1,   3,    900));
        m.put("week",  new Period(3,   10,   1800));
        m.put("month", new Period(5,   45,   3600));
        m.put("year",  new Period(7,   500,  7200));
        m.put("all",   new Period(10,  2500, 7200));
        return m;
    }

    public static class Period {
        private int pages = 3;
        private int minStocks = 10;
        private long ttlSeconds = 1800;

        public Period() {}

        public Period(int pages, int minStocks, long ttlSeconds) {
            this.pages = pages;
            this.minStocks = minStocks;
            this.ttlSeconds = ttlSeconds;
        }

        public int getPages() { return pages; }
        public void setPages(int pages) { this.pages = pages; }

        public int getMinStocks() { return minStocks; }
        public void setMinStocks(int minStocks) { this.minStocks = minStocks; }

        public long getTtlSeconds() { return ttlSeconds; }
        public void setTtlSeconds(long ttlSeconds) { this.ttlSeconds = ttlSeconds; }
    }
}
