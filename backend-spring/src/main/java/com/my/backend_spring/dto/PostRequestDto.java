package com.my.backend_spring.dto;

import com.my.backend_spring.entity.Post;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class PostRequestDto {
    private String title;
    private String content;

    public Post toEntity() {
        return Post.builder()
                .title(this.title)
                .content(this.content)
                .build();
    }
}