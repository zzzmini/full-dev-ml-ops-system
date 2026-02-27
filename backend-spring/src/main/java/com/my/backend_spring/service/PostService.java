package com.my.backend_spring.service;

import com.my.backend_spring.dto.PostRequestDto;
import com.my.backend_spring.dto.PostResponseDto;
import com.my.backend_spring.entity.Post;
import com.my.backend_spring.repository.PostRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class PostService {

    private final PostRepository repo;

    // 전체 목록
    public List<PostResponseDto> findAll() {
        return repo.findAll().stream()
                .map(PostResponseDto::from)
                .toList();
    }

    // 단건 조회
    public PostResponseDto findById(Long id) {
        return PostResponseDto.from(
                repo.findById(id)
                        .orElseThrow(() -> new RuntimeException("post not found: " + id))
        );
    }

    // 생성
    @Transactional
    public PostResponseDto create(PostRequestDto req) {
        return PostResponseDto.from(repo.save(req.toEntity()));
    }

    // 수정
    @Transactional
    public PostResponseDto update(Long id, PostRequestDto req) {
        Post post = repo.findById(id)
                .orElseThrow(() -> new RuntimeException("post not found: " + id));
        post.setTitle(req.getTitle());
        post.setContent(req.getContent());
        return PostResponseDto.from(post); // dirty checking으로 save() 불필요
    }

    // 삭제
    @Transactional
    public void delete(Long id) {
        repo.deleteById(id);
    }
}