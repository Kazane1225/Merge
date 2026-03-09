package com.merge.merge_backend.entity;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import com.fasterxml.jackson.annotation.JsonProperty;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Transient;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Entity
@Data
@EqualsAndHashCode(callSuper=false)
public class Article extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true)
    private String url;
    
    private String title;

    @JsonManagedReference
    @OneToMany(mappedBy = "article", cascade = CascadeType.ALL)
    private List<Memo> memos;

    @JsonManagedReference
    @OneToMany(mappedBy = "article", cascade = CascadeType.ALL)
    private List<CommentQiita> comments;

    @JsonManagedReference
    @OneToMany(mappedBy = "article", cascade = CascadeType.ALL)
    private List<CommentDev> devComments;

    @Column(columnDefinition = "TEXT") 
    @JsonProperty("rendered_body")
    private String renderedBody;

    @Column(name = "cover_image", columnDefinition = "TEXT")
    @JsonProperty("cover_image")
    private String coverImage;

    // 著者情報
    @Column(name = "user_id")
    private String userId;

    @Column(name = "user_login")
    private String userLogin;

    @Column(name = "user_name")
    private String userName;

    @Column(name = "user_profile_image_url", columnDefinition = "TEXT")
    private String userProfileImageUrl;

    @Transient
    @JsonProperty("user")
    public Map<String, Object> getUser() {
        if (userId == null && userLogin == null && userName == null && userProfileImageUrl == null) return null;
        Map<String, Object> user = new HashMap<>();
        user.put("id", userId);
        user.put("login", userLogin);
        user.put("name", userName);
        user.put("profile_image_url", userProfileImageUrl);
        return user;
    }

    @JsonProperty("user")
    public void setUser(Map<String, Object> user) {
        if (user != null) {
            Object id  = user.get("id");
            Object login = user.get("login");
            Object name = user.get("name");
            Object img  = user.get("profile_image_url");
            this.userId = id != null ? id.toString() : null;
            this.userLogin = login != null ? login.toString() : null;
            this.userName = name != null ? name.toString() : null;
            this.userProfileImageUrl = img != null ? img.toString() : null;
        }
    }

}