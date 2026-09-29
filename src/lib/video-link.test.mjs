import assert from "node:assert/strict"
import test from "node:test"

import { isValidVideoLink, resolveVideoLink } from "./video-link.ts"

const ID = "dQw4w9WgXcQ"
const YT_EMBED = { kind: "embed", provider: "YouTube", src: `https://www.youtube.com/embed/${ID}` }

test("turns every common YouTube link shape into an embed", () => {
  const links = [
    `https://www.youtube.com/watch?v=${ID}`,
    `https://youtube.com/watch?v=${ID}&t=42s`,
    `https://m.youtube.com/watch?v=${ID}`,
    `https://youtu.be/${ID}`,
    `https://youtu.be/${ID}?si=abc`,
    `https://www.youtube.com/embed/${ID}`,
    `https://www.youtube-nocookie.com/embed/${ID}`,
    `https://www.youtube.com/shorts/${ID}`,
    `https://www.youtube.com/live/${ID}`,
    `  https://www.youtube.com/watch?v=${ID}  `,
  ]

  for (const link of links) {
    assert.deepEqual(resolveVideoLink(link), YT_EMBED, link)
  }
})

test("turns Vimeo links into an embed, keeping the unlisted-video hash", () => {
  const plain = { kind: "embed", provider: "Vimeo", src: "https://player.vimeo.com/video/123456789" }
  assert.deepEqual(resolveVideoLink("https://vimeo.com/123456789"), plain)
  assert.deepEqual(resolveVideoLink("https://player.vimeo.com/video/123456789"), plain)
  assert.deepEqual(resolveVideoLink("https://vimeo.com/123456789/abcdef1234"), {
    ...plain,
    src: "https://player.vimeo.com/video/123456789?h=abcdef1234",
  })
})

test("turns Facebook video links into an embed, but not plain pages", () => {
  const embed = (href) => ({
    kind: "embed",
    provider: "Facebook",
    src: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(href)}&show_text=false`,
  })
  const videos = [
    "https://www.facebook.com/watch/?v=123456",
    "https://www.facebook.com/alivia/videos/123456789/",
    "https://www.facebook.com/reel/123456789",
    "https://fb.watch/abc123XYZ/",
  ]

  for (const link of videos) {
    assert.deepEqual(resolveVideoLink(link), embed(link), link)
  }
  assert.equal(resolveVideoLink("https://www.facebook.com/alivia")?.kind, "link")
})

test("treats direct video file urls as playable files", () => {
  assert.deepEqual(resolveVideoLink("https://cdn.example.com/a/demo.mp4"), {
    kind: "file",
    src: "https://cdn.example.com/a/demo.mp4",
  })
  assert.equal(resolveVideoLink("https://cdn.example.com/demo.WEBM?token=1")?.kind, "file")
})

test("falls back to a plain link for any other valid http(s) url", () => {
  const links = [
    "https://www.tiktok.com/@alivia/video/7123456789",
    "https://www.youtube.com/@channel",
    "https://www.youtube.com/watch?v=short",
    "http://example.com/some/page",
  ]

  for (const link of links) {
    assert.deepEqual(resolveVideoLink(link), { kind: "link", href: link }, link)
  }
})

test("rejects empty input, non-urls and non-http(s) schemes", () => {
  for (const value of ["", "   ", "not a url", "javascript:alert(1)", "ftp://example.com/a.mp4", null, undefined]) {
    assert.equal(resolveVideoLink(value), null, String(value))
    assert.equal(isValidVideoLink(value), false, String(value))
  }
  assert.equal(isValidVideoLink("https://example.com/video"), true)
})
