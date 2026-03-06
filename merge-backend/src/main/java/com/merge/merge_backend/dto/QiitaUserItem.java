package com.merge.merge_backend.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@JsonIgnoreProperties(ignoreUnknown = true)
@Data
public class QiitaUserItem {
    private String id;
    private String name;

    @JsonProperty("profile_image_url")
    private String profileImageUrl;
}
