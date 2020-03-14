---
title: "{{ replace .TranslationBaseName "-" " " | title }}"
date: {{ .Date }}
draft: true
description: This is the caption.
video:
  url: 's3/images/something.jpg'
  thumb: 's3/thumbs/something.jpg'
  preview: 's3/previews/something.jpg'
  poster: s3/posters/2018-05-26-16-30-59.jpg
  created: {{ .Date }}
  title:
  caption:
  controls: true
  duration: 0
  exif:
    make:
    model:
    lens:
    iso:
    aperture:
    shutter_speed:
    focal_length:
---
