package com.my.backend_spring.controller;

import com.my.backend_spring.dto.PostRequestDto;
import com.my.backend_spring.dto.PostResponseDto;
import com.my.backend_spring.service.PostService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/posts")
@RequiredArgsConstructor
public class PostController {

    private final PostService service;

    @GetMapping
    public List<PostResponseDto> list() {
        return service.findAll();
    }

    @GetMapping("/{id}")
    public PostResponseDto get(@PathVariable Long id) {
        return service.findById(id);
    }

    @PostMapping
    public PostResponseDto create(@RequestBody PostRequestDto req) {
        return service.create(req);
    }

    @PutMapping("/{id}")
    public PostResponseDto update(@PathVariable Long id, @RequestBody PostRequestDto req) {
        return service.update(id, req);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}