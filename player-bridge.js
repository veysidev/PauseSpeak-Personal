(() => {
  if (window.__PAUSESPEAK_PLAYER_BRIDGE_LOADED__) {
    return;
  }

  window.__PAUSESPEAK_PLAYER_BRIDGE_LOADED__ = true;

  const capturedSubtitleTracks = new Map();
  const inspectedSubtitleResponses = new Set();
  const maximumSubtitleBytes = 5 * 1024 * 1024;
  let activeMediaKey = "";
  let youtubeCaptionLoad = null;

  function getPlaybackPlatform() {
    const hostname = window.location.hostname
      .toLowerCase();

    if (
      hostname === "youtube.com" ||
      hostname.endsWith(".youtube.com")
    ) {
      return "youtube";
    }

    if (
      hostname === "netflix.com" ||
      hostname.endsWith(".netflix.com")
    ) {
      return "netflix";
    }

    return "unsupported";
  }

  function getYouTubeVideoId() {
    if (window.location.pathname === "/watch") {
      return new URLSearchParams(
        window.location.search
      ).get("v") || "";
    }

    const shortsMatch =
      window.location.pathname.match(
        /^\/shorts\/([^/?#]+)/
      );

    return shortsMatch?.[1] || "";
  }

  function getPlaybackMediaKey() {
    const platform = getPlaybackPlatform();

    if (platform === "youtube") {
      return `youtube:${getYouTubeVideoId()}`;
    }

    if (platform === "netflix") {
      return `netflix:${window.location.pathname}`;
    }

    return "unsupported";
  }

  function refreshMediaScope() {
    const nextMediaKey = getPlaybackMediaKey();

    if (nextMediaKey === activeMediaKey) {
      return nextMediaKey;
    }

    activeMediaKey = nextMediaKey;
    capturedSubtitleTracks.clear();
    inspectedSubtitleResponses.clear();
    youtubeCaptionLoad = null;

    return nextMediaKey;
  }

  function getNetflixPlayer() {
    const playerApp =
      window.netflix?.appContext?.state?.playerApp;

    const playerApi = playerApp?.getAPI?.();
    const videoPlayerManager = playerApi?.videoPlayer;

    const sessionIds =
      videoPlayerManager?.getAllPlayerSessionIds?.() || [];

    const sessionId =
      sessionIds.find((id) =>
        String(id).toLowerCase().includes("watch")
      ) || sessionIds[0];

    if (!sessionId) {
      return null;
    }

    return videoPlayerManager
      ?.getVideoPlayerBySessionId?.(sessionId);
  }

  function getYouTubeVideo() {
    return document.querySelector(
      "video.html5-main-video, video"
    );
  }

  function getYouTubePlayerResponse() {
    const player = document.getElementById(
      "movie_player"
    );
    const directResponse =
      player?.getPlayerResponse?.();

    if (directResponse?.captions) {
      return directResponse;
    }

    if (window.ytInitialPlayerResponse?.captions) {
      return window.ytInitialPlayerResponse;
    }

    const serializedResponse =
      window.ytplayer?.config?.args
        ?.player_response;

    if (typeof serializedResponse === "string") {
      try {
        return JSON.parse(serializedResponse);
      } catch (error) {
        console.debug(
          "PauseSpeak YouTube oynatıcı yanıtını okuyamadı:",
          error
        );
      }
    }

    return null;
  }

  function postPageMessage(type, payload = {}) {
    window.postMessage(
      {
        source: "PAUSESPEAK_PAGE",
        type,
        ...payload
      },
      "*"
    );
  }

  function sendResponse(
    type,
    requestId,
    success,
    message
  ) {
    postPageMessage(type, {
      requestId,
      success,
      message
    });
  }

  function wait(milliseconds) {
    return new Promise((resolve) => {
      setTimeout(resolve, milliseconds);
    });
  }

  function cleanSubtitleText(value) {
    const container = document.createElement("div");

    container.innerHTML = String(value || "")
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<[^>]+>/g, " ");

    return String(container.textContent || "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function parseClockTime(value, timing = {}) {
    const text = String(value || "").trim();

    if (!text) {
      return null;
    }

    const clockMatch = text.match(
      /^(\d+):(\d{2}):(\d{2})(?:[.,](\d+))?$/
    );

    if (clockMatch) {
      const fraction = clockMatch[4]
        ? Number(`0.${clockMatch[4]}`)
        : 0;

      return Math.round(
        (
          Number(clockMatch[1]) * 3600 +
          Number(clockMatch[2]) * 60 +
          Number(clockMatch[3]) +
          fraction
        ) * 1000
      );
    }

    const frameMatch = text.match(
      /^(\d+):(\d{2}):(\d{2}):(\d{2})$/
    );

    if (frameMatch) {
      const frameRate =
        Number(timing.frameRate) || 30;

      return Math.round(
        (
          Number(frameMatch[1]) * 3600 +
          Number(frameMatch[2]) * 60 +
          Number(frameMatch[3]) +
          Number(frameMatch[4]) / frameRate
        ) * 1000
      );
    }

    const offsetMatch = text.match(
      /^(-?\d+(?:\.\d+)?)(h|m|s|ms|f|t)$/
    );

    if (!offsetMatch) {
      return null;
    }

    const amount = Number(offsetMatch[1]);
    const unit = offsetMatch[2];

    if (!Number.isFinite(amount)) {
      return null;
    }

    if (unit === "h") {
      return Math.round(amount * 3600000);
    }

    if (unit === "m") {
      return Math.round(amount * 60000);
    }

    if (unit === "s") {
      return Math.round(amount * 1000);
    }

    if (unit === "ms") {
      return Math.round(amount);
    }

    if (unit === "f") {
      return Math.round(
        amount /
          (Number(timing.frameRate) || 30) *
          1000
      );
    }

    return Math.round(
      amount /
        (Number(timing.tickRate) || 1) *
        1000
    );
  }

  function normalizeCues(cues) {
    const normalized = [];

    for (const cue of cues) {
      const startTimeMs = Number(
        cue?.startTimeMs
      );
      const endTimeMs = Number(
        cue?.endTimeMs
      );
      const text = cleanSubtitleText(
        cue?.text
      );

      if (
        !Number.isFinite(startTimeMs) ||
        !Number.isFinite(endTimeMs) ||
        startTimeMs < 0 ||
        endTimeMs <= startTimeMs ||
        !text
      ) {
        continue;
      }

      const previous =
        normalized[normalized.length - 1];

      if (
        previous &&
        previous.text === text &&
        Math.abs(
          previous.startTimeMs - startTimeMs
        ) < 100 &&
        Math.abs(
          previous.endTimeMs - endTimeMs
        ) < 100
      ) {
        continue;
      }

      normalized.push({
        startTimeMs: Math.round(startTimeMs),
        endTimeMs: Math.round(endTimeMs),
        text: text.slice(0, 700)
      });
    }

    return normalized
      .sort(
        (first, second) =>
          first.startTimeMs -
            second.startTimeMs ||
          first.endTimeMs -
            second.endTimeMs
      )
      .slice(0, 10000);
  }

  function parseWebVtt(text) {
    if (
      !/^\s*WEBVTT\b/i.test(text) &&
      !/-->/.test(text)
    ) {
      return null;
    }

    const lines = String(text || "")
      .replace(/^\uFEFF/, "")
      .split(/\r?\n/);
    const cues = [];

    for (let index = 0; index < lines.length; index += 1) {
      const timingLine = lines[index].match(
        /((?:\d+:)?\d{2}:\d{2}[.,]\d+)\s+-->\s+((?:\d+:)?\d{2}:\d{2}[.,]\d+)/
      );

      if (!timingLine) {
        continue;
      }

      const normalizeVttTime = (value) => {
        const pieces = value.replace(",", ".").split(":");

        if (pieces.length === 2) {
          return `00:${value.replace(",", ".")}`;
        }

        return value.replace(",", ".");
      };

      const startTimeMs = parseClockTime(
        normalizeVttTime(timingLine[1])
      );
      const endTimeMs = parseClockTime(
        normalizeVttTime(timingLine[2])
      );
      const textLines = [];

      index += 1;

      while (
        index < lines.length &&
        lines[index].trim() !== ""
      ) {
        textLines.push(lines[index]);
        index += 1;
      }

      cues.push({
        startTimeMs,
        endTimeMs,
        text: textLines.join(" ")
      });
    }

    const normalizedCues = normalizeCues(cues);

    return normalizedCues.length > 1
      ? {
          language: "",
          format: "webvtt",
          cues: normalizedCues
        }
      : null;
  }

  function shouldSeparateTtmlRuns(
    existingText,
    incomingText
  ) {
    const existing = String(existingText || "");
    const incoming = String(incomingText || "");

    if (
      !existing ||
      !incoming ||
      /\s$/.test(existing) ||
      /^\s/.test(incoming)
    ) {
      return false;
    }

    const left = existing.trimEnd();
    const right = incoming.trimStart();

    if (!left || !right) {
      return false;
    }

    const leftCharacter = left.slice(-1);
    const rightCharacter = right.charAt(0);

    if (
      /^[,.;:!?%\u2026)\]}\u00bb\u201d'\u2019]/.test(
        rightCharacter
      ) ||
      /^[\-\u2010-\u2015/]/.test(
        rightCharacter
      ) ||
      /[\-\u2010-\u2015/]$/.test(
        leftCharacter
      ) ||
      /[(\[{\u00ab\u201c\u2018$\u00a3\u20ac\u00a5]$/.test(
        leftCharacter
      )
    ) {
      return false;
    }

    if (
      /['\u2019]$/.test(leftCharacter) &&
      /^(?:s|t|re|ve|ll|d|m)\b/i.test(right)
    ) {
      return false;
    }

    if (
      /[.,:]$/.test(leftCharacter) &&
      /\d/.test(left.slice(-2, -1)) &&
      /\d/.test(rightCharacter)
    ) {
      return false;
    }

    return true;
  }

  function extractTtmlParagraphText(paragraph) {
    function readNode(node) {
      if (!node) {
        return "";
      }

      if (
        node.nodeType === 3 ||
        node.nodeType === 4
      ) {
        return String(
          node.nodeValue || node.textContent || ""
        );
      }

      const localName = String(
        node.localName || node.nodeName || ""
      )
        .split(":")
        .pop()
        .toLowerCase();

      if (localName === "br") {
        return " ";
      }

      let combined = "";

      for (const child of node.childNodes || []) {
        const childText = readNode(child);

        if (!childText) {
          continue;
        }

        if (
          shouldSeparateTtmlRuns(
            combined,
            childText
          )
        ) {
          combined += " ";
        }

        combined += childText;
      }

      return combined;
    }

    return readNode(paragraph);
  }

  function parseTtml(text) {
    if (!/<(?:\w+:)?tt\b/i.test(text)) {
      return null;
    }

    const parser = new DOMParser();
    const documentNode = parser.parseFromString(
      text,
      "application/xml"
    );

    if (
      documentNode.querySelector("parsererror")
    ) {
      return null;
    }

    const root = documentNode.documentElement;
    const timing = {
      frameRate:
        root.getAttribute("ttp:frameRate") ||
        root.getAttribute("frameRate"),
      tickRate:
        root.getAttribute("ttp:tickRate") ||
        root.getAttribute("tickRate")
    };
    const language =
      root.getAttribute("xml:lang") ||
      root.getAttribute("lang") ||
      "";
    const paragraphs = [
      ...documentNode.getElementsByTagNameNS(
        "*",
        "p"
      )
    ];
    const cues = [];

    for (const paragraph of paragraphs) {
      const begin = parseClockTime(
        paragraph.getAttribute("begin"),
        timing
      );
      let end = parseClockTime(
        paragraph.getAttribute("end"),
        timing
      );

      if (end === null) {
        const duration = parseClockTime(
          paragraph.getAttribute("dur"),
          timing
        );

        if (
          begin !== null &&
          duration !== null
        ) {
          end = begin + duration;
        }
      }

      cues.push({
        startTimeMs: begin,
        endTimeMs: end,
        text: extractTtmlParagraphText(
          paragraph
        )
      });
    }

    const normalizedCues = normalizeCues(cues);

    return normalizedCues.length > 1
      ? {
          language,
          format: "ttml",
          cues: normalizedCues
        }
      : null;
  }

  function parseSubtitleDocument(text) {
    const source = String(text || "").trim();

    if (!source || source.length > maximumSubtitleBytes) {
      return null;
    }

    return parseWebVtt(source) || parseTtml(source);
  }

  function createTrackId(url, parsedTrack) {
    const source = [
      String(url || "").replace(/[?#].*$/, ""),
      parsedTrack.language,
      parsedTrack.cues[0]?.startTimeMs,
      parsedTrack.cues.at(-1)?.endTimeMs
    ].join("|");
    let hash = 2166136261;

    for (let index = 0; index < source.length; index += 1) {
      hash ^= source.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }

    return `track-${(hash >>> 0).toString(16)}`;
  }

  function publishSubtitleTrack(url, parsedTrack) {
    refreshMediaScope();

    const trackId = createTrackId(
      url,
      parsedTrack
    );
    const previousTrack =
      capturedSubtitleTracks.get(trackId);

    if (
      previousTrack &&
      previousTrack.cues.length >=
        parsedTrack.cues.length
    ) {
      return;
    }

    const track = {
      trackId,
      language: parsedTrack.language,
      format: parsedTrack.format,
      cues: parsedTrack.cues
    };

    capturedSubtitleTracks.set(
      trackId,
      track
    );

    postPageMessage(
      "PAUSESPEAK_SUBTITLE_TRACK",
      { track }
    );
  }

  function getYouTubeTrackLabel(track) {
    const name = track?.name;

    if (typeof name?.simpleText === "string") {
      return name.simpleText;
    }

    if (Array.isArray(name?.runs)) {
      return name.runs
        .map((run) => run?.text || "")
        .join("")
        .trim();
    }

    return track?.languageCode || "";
  }

  function parseYouTubeJson3(data) {
    const events = Array.isArray(data?.events)
      ? data.events
      : [];
    const rawCues = events
      .map((event, index) => {
        const startTimeMs = Number(
          event?.tStartMs
        );
        const nextStartTimeMs = Number(
          events[index + 1]?.tStartMs
        );
        const durationMs = Number(
          event?.dDurationMs
        );
        const inferredEndTimeMs =
          Number.isFinite(nextStartTimeMs) &&
          nextStartTimeMs > startTimeMs
            ? nextStartTimeMs
            : startTimeMs + 2000;
        const endTimeMs =
          Number.isFinite(durationMs) &&
          durationMs > 0
            ? startTimeMs + durationMs
            : inferredEndTimeMs;
        const text = Array.isArray(
          event?.segs
        )
          ? event.segs
              .map((segment) =>
                segment?.utf8 || ""
              )
              .join("")
          : "";

        return {
          startTimeMs,
          endTimeMs,
          text
        };
      });

    return normalizeCues(rawCues);
  }

  function rankYouTubeCaptionTrack(track) {
    const language = String(
      track?.languageCode || ""
    ).toLowerCase();
    let score = 0;

    if (/^en(?:-|$)/.test(language)) {
      score += 100;
    }

    if (track?.kind !== "asr") {
      score += 20;
    }

    if (track?.isTranslatable) {
      score += 2;
    }

    return score;
  }

  async function loadYouTubeCaptionTracks() {
    const mediaKey = refreshMediaScope();
    const videoId = getYouTubeVideoId();

    if (
      getPlaybackPlatform() !== "youtube" ||
      !videoId
    ) {
      return;
    }

    if (
      youtubeCaptionLoad?.mediaKey ===
      mediaKey
    ) {
      return youtubeCaptionLoad.promise;
    }

    const promise = (async () => {
      let playerResponse = null;

      for (
        let attempt = 0;
        attempt < 20;
        attempt += 1
      ) {
        playerResponse =
          getYouTubePlayerResponse();

        if (playerResponse?.captions) {
          break;
        }

        await wait(250);
      }

      const trackList =
        playerResponse?.captions
          ?.playerCaptionsTracklistRenderer
          ?.captionTracks;

      if (!Array.isArray(trackList)) {
        return;
      }

      const selectedTracks = [...trackList]
        .sort(
          (first, second) =>
            rankYouTubeCaptionTrack(second) -
            rankYouTubeCaptionTrack(first)
        )
        .slice(0, 6);

      await Promise.allSettled(
        selectedTracks.map(async (track) => {
          if (!track?.baseUrl) {
            return;
          }

          const captionUrl = new URL(
            track.baseUrl,
            window.location.href
          );

          captionUrl.searchParams.set(
            "fmt",
            "json3"
          );

          const response = await window.fetch(
            captionUrl.toString(),
            {
              credentials: "include"
            }
          );

          if (!response.ok) {
            return;
          }

          const cues = parseYouTubeJson3(
            await response.json()
          );

          if (
            cues.length < 2 ||
            getYouTubeVideoId() !== videoId ||
            getPlaybackMediaKey() !== mediaKey
          ) {
            return;
          }

          const trackId = [
            "youtube",
            videoId,
            track.vssId ||
              track.languageCode ||
              "captions"
          ].join(":");
          const subtitleTrack = {
            trackId,
            language:
              track.languageCode || "",
            format:
              track.kind === "asr"
                ? "youtube-json3-asr"
                : "youtube-json3",
            label: getYouTubeTrackLabel(
              track
            ),
            cues
          };

          capturedSubtitleTracks.set(
            trackId,
            subtitleTrack
          );
          postPageMessage(
            "PAUSESPEAK_SUBTITLE_TRACK",
            { track: subtitleTrack }
          );
        })
      );
    })().catch((error) => {
      console.debug(
        "PauseSpeak YouTube altyazıları yüklenemedi:",
        error
      );
    });

    youtubeCaptionLoad = {
      mediaKey,
      promise
    };

    void promise.finally(() => {
      const hasCurrentYouTubeTrack = [
        ...capturedSubtitleTracks.keys()
      ].some((trackId) =>
        trackId.startsWith(
          `youtube:${videoId}:`
        )
      );

      if (
        getPlaybackMediaKey() === mediaKey &&
        !hasCurrentYouTubeTrack &&
        youtubeCaptionLoad?.mediaKey ===
          mediaKey
      ) {
        youtubeCaptionLoad = null;
      }
    });

    return promise;
  }

  function looksLikeSubtitleResponse(
    url,
    contentType,
    contentLength
  ) {
    if (
      Number.isFinite(contentLength) &&
      contentLength > maximumSubtitleBytes
    ) {
      return false;
    }

    const normalizedType = String(
      contentType || ""
    ).toLowerCase();
    const normalizedUrl = String(
      url || ""
    ).toLowerCase();

    if (
      /(?:video|audio|image)\//.test(
        normalizedType
      )
    ) {
      return false;
    }

    if (
      /(?:vtt|ttml|xml|dfxp|text\/plain)/.test(
        normalizedType
      )
    ) {
      return true;
    }

    return /(?:timedtext|subtitle|caption|\.vtt(?:[?#]|$)|\.ttml(?:[?#]|$)|\.dfxp(?:[?#]|$))/.test(
      normalizedUrl
    );
  }

  async function inspectSubtitleText(
    url,
    contentType,
    contentLength,
    readText
  ) {
    if (
      !looksLikeSubtitleResponse(
        url,
        contentType,
        contentLength
      )
    ) {
      return;
    }

    const inspectionKey = [
      url,
      contentLength,
      contentType
    ].join("|");

    if (inspectedSubtitleResponses.has(inspectionKey)) {
      return;
    }

    inspectedSubtitleResponses.add(inspectionKey);

    if (inspectedSubtitleResponses.size > 300) {
      const firstKey =
        inspectedSubtitleResponses
          .values()
          .next()
          .value;

      inspectedSubtitleResponses.delete(firstKey);
    }

    try {
      const text = await readText();
      const parsedTrack =
        parseSubtitleDocument(text);

      if (parsedTrack) {
        publishSubtitleTrack(
          url,
          parsedTrack
        );
      }
    } catch (error) {
      console.debug(
        "PauseSpeak altyazı yanıtı okunamadı:",
        error
      );
    }
  }

  function installFetchObserver() {
    if (
      typeof window.fetch !== "function" ||
      window.fetch.__pauseSpeakObserved
    ) {
      return;
    }

    const originalFetch = window.fetch;

    const observedFetch = async function (...args) {
      const response = await Reflect.apply(
        originalFetch,
        this,
        args
      );

      try {
        const clone = response.clone();
        const requestUrl =
          response.url ||
          (typeof args[0] === "string"
            ? args[0]
            : args[0]?.url) ||
          "";
        const contentType =
          clone.headers.get("content-type") || "";
        const contentLength = Number(
          clone.headers.get("content-length")
        );

        void inspectSubtitleText(
          requestUrl,
          contentType,
          contentLength,
          () => clone.text()
        );
      } catch (error) {
        console.debug(
          "PauseSpeak fetch altyazı gözlemi başarısız:",
          error
        );
      }

      return response;
    };

    Object.defineProperty(
      observedFetch,
      "__pauseSpeakObserved",
      {
        value: true
      }
    );

    window.fetch = observedFetch;
  }

  function installXhrObserver() {
    const prototype =
      window.XMLHttpRequest?.prototype;

    if (
      !prototype ||
      prototype.open.__pauseSpeakObserved
    ) {
      return;
    }

    const originalOpen = prototype.open;

    const observedOpen = function (
      method,
      url,
      ...rest
    ) {
      this.__pauseSpeakUrl = String(
        url || ""
      );

      this.addEventListener(
        "load",
        () => {
          try {
            const contentType =
              this.getResponseHeader(
                "content-type"
              ) || "";
            const contentLength = Number(
              this.getResponseHeader(
                "content-length"
              )
            );

            void inspectSubtitleText(
              this.responseURL ||
                this.__pauseSpeakUrl,
              contentType,
              contentLength,
              async () => {
                if (
                  !this.responseType ||
                  this.responseType === "text"
                ) {
                  return this.responseText;
                }

                if (
                  this.responseType === "document" &&
                  this.responseXML
                ) {
                  return new XMLSerializer()
                    .serializeToString(
                      this.responseXML
                    );
                }

                if (
                  this.responseType === "arraybuffer" &&
                  this.response instanceof ArrayBuffer &&
                  this.response.byteLength <=
                    maximumSubtitleBytes
                ) {
                  return new TextDecoder().decode(
                    this.response
                  );
                }

                return "";
              }
            );
          } catch (error) {
            console.debug(
              "PauseSpeak XHR altyazı gözlemi başarısız:",
              error
            );
          }
        },
        { once: true }
      );

      return Reflect.apply(
        originalOpen,
        this,
        [method, url, ...rest]
      );
    };

    Object.defineProperty(
      observedOpen,
      "__pauseSpeakObserved",
      {
        value: true
      }
    );

    prototype.open = observedOpen;
  }

  async function waitForSeek(
    player,
    targetTimeMs
  ) {
    if (
      typeof player.getCurrentTime !== "function"
    ) {
      await wait(500);
      return;
    }

    for (
      let attempt = 0;
      attempt < 25;
      attempt += 1
    ) {
      const currentTimeMs = Number(
        player.getCurrentTime()
      );

      if (
        Number.isFinite(currentTimeMs) &&
        Math.abs(currentTimeMs - targetTimeMs) <
          1500
      ) {
        return;
      }

      await wait(100);
    }
  }

  async function waitForVideoSeek(
    video,
    targetTimeMs
  ) {
    for (
      let attempt = 0;
      attempt < 25;
      attempt += 1
    ) {
      const currentTimeMs =
        Number(video.currentTime) * 1000;

      if (
        Number.isFinite(currentTimeMs) &&
        Math.abs(
          currentTimeMs - targetTimeMs
        ) < 1500
      ) {
        return;
      }

      await wait(100);
    }
  }

  async function seekYouTubePlayer(
    targetTimeMs,
    shouldPlay
  ) {
    const video = getYouTubeVideo();
    const player = document.getElementById(
      "movie_player"
    );

    if (!video) {
      throw new Error(
        "YouTube video öğesi bulunamadı."
      );
    }

    if (typeof player?.pauseVideo === "function") {
      player.pauseVideo();
    } else {
      video.pause();
    }

    const targetSeconds = targetTimeMs / 1000;

    if (typeof player?.seekTo === "function") {
      player.seekTo(targetSeconds, true);
    } else if (
      typeof video.fastSeek === "function"
    ) {
      video.fastSeek(targetSeconds);
    } else {
      Reflect.set(
        video,
        "currentTime",
        targetSeconds
      );
    }

    await waitForVideoSeek(
      video,
      targetTimeMs
    );

    if (shouldPlay) {
      if (
        typeof player?.playVideo ===
        "function"
      ) {
        player.playVideo();
      } else {
        await video.play();
      }
    } else if (
      typeof player?.pauseVideo ===
      "function"
    ) {
      player.pauseVideo();
    } else {
      video.pause();
    }
  }

  async function seekPlayer(
    responseType,
    requestId,
    targetTimeMs,
    shouldPlay = true
  ) {
    try {
      if (
        getPlaybackPlatform() ===
        "youtube"
      ) {
        await seekYouTubePlayer(
          targetTimeMs,
          shouldPlay
        );

        sendResponse(
          responseType,
          requestId,
          true,
          shouldPlay
            ? "Seçilen altyazı oynatılıyor."
            : "Video konumu geri yüklendi."
        );
        return;
      }

      const player = getNetflixPlayer();

      if (
        !player ||
        typeof player.seek !== "function"
      ) {
        sendResponse(
          responseType,
          requestId,
          false,
          "Video oynatıcı kontrolü bulunamadı."
        );
        return;
      }

      if (typeof player.pause === "function") {
        await Promise.resolve(player.pause());
      }

      await Promise.resolve(
        player.seek(targetTimeMs)
      );

      await waitForSeek(player, targetTimeMs);

      if (shouldPlay) {
        if (typeof player.play === "function") {
          await Promise.resolve(player.play());
        } else {
          const video = document.querySelector("video");

          if (!video) {
            throw new Error(
              "Video öğesi bulunamadı."
            );
          }

          await video.play();
        }
      } else if (
        typeof player.pause === "function"
      ) {
        await Promise.resolve(player.pause());
      } else {
        const video = document.querySelector("video");

        if (!video) {
          throw new Error(
            "Video öğesi bulunamadı."
          );
        }

        video.pause();
      }

      sendResponse(
        responseType,
        requestId,
        true,
        shouldPlay
          ? "Seçilen altyazı oynatılıyor."
          : "Video konumu geri yüklendi."
      );
    } catch (error) {
      console.error(
        "PauseSpeak zaman atlama hatası:",
        error
      );

      sendResponse(
        responseType,
        requestId,
        false,
        "Video zaman atlama işlemini reddetti."
      );
    }
  }

  installFetchObserver();
  installXhrObserver();

  window.addEventListener("message", (event) => {
    if (event.source !== window) {
      return;
    }

    const data = event.data;

    if (
      !data ||
      data.source !== "PAUSESPEAK_EXTENSION"
    ) {
      return;
    }

    if (
      data.type ===
      "PAUSESPEAK_SUBTITLE_TRACKS_REQUEST"
    ) {
      refreshMediaScope();

      for (const track of
        capturedSubtitleTracks.values()) {
        postPageMessage(
          "PAUSESPEAK_SUBTITLE_TRACK",
          { track }
        );
      }

      if (
        getPlaybackPlatform() ===
        "youtube"
      ) {
        void loadYouTubeCaptionTracks();
      }

      return;
    }

    const requestSettings = {
      PAUSESPEAK_REPLAY_REQUEST: {
        responseType:
          "PAUSESPEAK_REPLAY_RESPONSE"
      },
      PAUSESPEAK_SEEK_REQUEST: {
        responseType:
          "PAUSESPEAK_SEEK_RESPONSE",
        shouldPlay: true
      },
      PAUSESPEAK_COACH_PREVIEW_REQUEST: {
        responseType:
          "PAUSESPEAK_COACH_PREVIEW_RESPONSE",
        shouldPlay: true
      },
      PAUSESPEAK_COACH_RETURN_REQUEST: {
        responseType:
          "PAUSESPEAK_COACH_RETURN_RESPONSE",
        shouldPlay: false
      }
    }[data.type];

    if (!requestSettings) {
      return;
    }

    const targetTimeMs = Number(
      data.targetTimeMs
    );

    if (
      !Number.isFinite(targetTimeMs) ||
      targetTimeMs < 0
    ) {
      sendResponse(
        requestSettings.responseType,
        data.requestId,
        false,
        "Geçersiz altyazı başlangıç zamanı."
      );
      return;
    }

    void seekPlayer(
      requestSettings.responseType,
      data.requestId,
      Math.round(targetTimeMs),
      requestSettings.shouldPlay !== false
    );
  });
})();
