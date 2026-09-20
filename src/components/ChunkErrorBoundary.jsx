import { Component } from "react";

// Catches a failed lazy-chunk import (e.g. this browser has an old
// index.html cached from before a new deploy, so it's asking for a JS
// chunk filename — content-hashed — that no longer exists on the server).
// Reloads once to pick up the current index.html/bundle rather than
// leaving the app crashed on a blank page. If the reload doesn't fix it
// (a real error, not a stale cache), it stops retrying and shows a message.
export class ChunkErrorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    const key = "hl_chunk_reload_attempted";
    if (!sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, "1");
      window.location.reload();
    }
  }

  render() {
    if (this.state.failed) {
      return (
        <div style={{ textAlign: "center", padding: "80px 20px", color: "#5B6472" }}>
          Couldn't load this page — try refreshing.
        </div>
      );
    }
    return this.props.children;
  }
}
