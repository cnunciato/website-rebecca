import { Component } from '@stencil/core';

@Component({
  tag: "cdn-menu",
  shadow: false,
})
export class Rating {

  render() {
    return <nav class="font-sans py-4 bg-blue-900 text-white border-b border-blue-800 shadow">
        <header class="container mx-auto">
            <h1 class="text-lg font-bold">
                <a href="/">Christian Nunciato</a>
            </h1>
            <ul class="p-0">
                <li class=""><a href="/photos/">Pictures</a></li>
                <li class="mx-4"><a href="/videos/">Videos</a></li>
                <li class="mx-4"><a href="/sounds/">Sounds</a></li>
                <li class="mx-4"><a href="/words/">Words</a></li>
                <li class="mx-4"><a href="/collections/">Collections</a></li>
                <li class="mx-4"><a href="/drops/">Drops</a></li>
                <li class=""><a href="/about/">About</a></li>
            </ul>
            <ul class="p-0">
                <li class="mx-2"><a href="https://twitter.com/cnunciato" title="Twitter"><i class="fab fa-twitter"></i></a></li>
                <li class="mx-2"><a href="https://instagram.com/cnunciato" title="Instagram"><i class="fab fa-instagram"></i></a></li>
                <li class="mx-2"><a href="https://vimeo.com/cnunciato" title="Vimeo"><i class="fab fa-vimeo"></i></a></li>
                <li class="mx-2"><a href="https://github.com/cnunciato" title="GitHub"><i class="fab fa-github"></i></a></li>
                <li class="mx-2"><a href="/index.xml" title="RSS"><i class="fas fa-rss"></i></a></li>
            </ul>
        </header>
    </nav>
  }
}
