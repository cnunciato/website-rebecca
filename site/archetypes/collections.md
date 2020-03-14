---
title: {{ replace .TranslationBaseName "-" " " | title }}
date: {{ .Date }}
draft: true
description: This is the caption.
featured:
  type: photo
  url: 's3/images/something.jpg'
  thumb: 's3/thumbs/something.jpg'
  preview: 's3/previews/something.jpg'
  created: {{ .Date }}
  title: ''
  caption: ''
items:
  - type: photo
    url: 's3/images/something.jpg'
    thumb: 's3/thumbs/something.jpg'
    created: {{ .Date }}
    title: ''
    caption: ''
---
