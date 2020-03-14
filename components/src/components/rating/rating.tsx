import { Component, Prop } from '@stencil/core';

@Component({
  tag: "cdn-rating",
  styleUrl: "./rating.scss",
  shadow: true,
})
export class Rating {

  @Prop() rating: number;

  render() {
    return new Array(5)
      .fill(null)
      .map((_, i) => <span class={i < this.rating ? "active" : ""}>★</span>);
  }
}
