(function () {
  "use strict";

  const DATA = window.COURSE_408;
  const views = {
    home: document.getElementById("view-home"),
    subject: document.getElementById("view-subject"),
  };
  const navTitle = document.getElementById("navTitle");
  const btnBack = document.getElementById("btnBack");
  const dockItems = document.querySelectorAll(".dock-item");
  const main = document.getElementById("main");

  let demoTimers = [];
  let cacheStep = 0;
  let procStep = 0;
  let hsStep = -1;

  function clearDemos() {
    demoTimers.forEach((t) => clearInterval(t));
    demoTimers = [];
  }

  function setView(name, id, skipHash) {
    clearDemos();
    const isHome = name === "home";
    views.home.classList.toggle("active", isHome);
    views.subject.classList.toggle("active", !isHome);

    if (isHome) {
      navTitle.textContent = "408 速记";
      btnBack.hidden = true;
      dockItems.forEach((d) => d.classList.toggle("active", d.dataset.nav === "home"));
      if (!skipHash && location.hash && location.hash !== "#home") {
        history.pushState(null, "", "#home");
      }
    } else {
      const c = DATA[id];
      if (!c) return setView("home", null, skipHash);
      views.subject.style.setProperty("--sc", c.color);
      renderSubject(c);
      navTitle.textContent = c.name;
      btnBack.hidden = false;
      dockItems.forEach((d) => d.classList.toggle("active", d.dataset.nav === id));
      if (!skipHash && location.hash !== "#" + id) {
        history.pushState(null, "", "#" + id);
      }
    }
    window.scrollTo(0, 0);
    if (main) main.scrollTop = 0;
  }

  function badgeHtml(t) {
    let h = "";
    if (t.star) h += '<span class="badge badge-b">★ 重点</span>';
    if (t.isNew) h += '<span class="badge badge-n">新</span>';
    return h;
  }

  /** 重点/新增块：按中文/英文分号拆成一段 */
  function splitSegs(text) {
    return String(text)
      .split(/[；;]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  function segListHtml(text) {
    const segs = splitSegs(text);
    if (segs.length <= 1) return segs[0] || "";
    return `<div class="point-lines">${segs.map((s) => `<p>${s}</p>`).join("")}</div>`;
  }

  function pointsHtml(points) {
    return points
      .map((p) => {
        if (p.type === "star") {
          return `<div class="point hl"><span class="point-label">★ 重点</span><div class="point-body">${segListHtml(p.text)}</div></div>`;
        }
        if (p.type === "new") {
          return `<div class="point hl-new"><span class="point-label n">新</span><div class="point-body">${segListHtml(p.text)}</div></div>`;
        }
        return `<div class="point">${p.text}</div>`;
      })
      .join("");
  }

  function tableHtml(tbl) {
    if (!tbl) return "";
    const th = tbl.headers.map((h) => `<th>${h}</th>`).join("");
    const tr = tbl.rows
      .map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`)
      .join("");
    return `<div class="table-wrap"><table class="cmp"><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table></div>`;
  }

  function demoHtml(kind) {
    if (kind === "cache") {
      return `
      <div class="demo" data-demo="cache">
        <div class="demo-title">Cache 组相联命中</div>
        <div class="demo-stage">
          <div class="cache-demo">
            <div class="cache-row">
              <span class="cache-label">组 0</span>
              <div class="cache-block" data-slot="0">—</div>
              <div class="cache-block" data-slot="1">—</div>
            </div>
            <div class="cache-row">
              <span class="cache-label">组 1</span>
              <div class="cache-block" data-slot="2">—</div>
              <div class="cache-block" data-slot="3">—</div>
            </div>
          </div>
        </div>
        <div class="demo-caption" id="cacheCap">CPU 访存 → 算组号 → 比较标记</div>
        <button class="demo-btn" type="button" data-act="cache">模拟访存</button>
      </div>`;
    }
    if (kind === "proc") {
      return `
      <div class="demo" data-demo="proc">
        <div class="demo-title">进程状态转换</div>
        <div class="demo-stage">
          <div class="pstate">
            <div class="pnode">创建</div><span class="parrow">→</span>
            <div class="pnode">就绪</div><span class="parrow">→</span>
            <div class="pnode">运行</div><span class="parrow">→</span>
            <div class="pnode">阻塞</div><span class="parrow">→</span>
            <div class="pnode">完成</div>
          </div>
        </div>
        <div class="demo-caption" id="procCap">创建 → 就绪 → 运行 …</div>
        <button class="demo-btn" type="button" data-act="proc">重播</button>
      </div>`;
    }
    if (kind === "hs") {
      return `
      <div class="demo" data-demo="hs">
        <div class="demo-title">TCP 三次握手</div>
        <div class="demo-stage">
          <div class="hs-flow">
            <div class="hs-step"><span class="hs-side">客户端</span><div class="hs-line">SYN=1, seq=x</div></div>
            <div class="hs-step"><span class="hs-side">服务端</span><div class="hs-line">SYN=1, ACK=1, seq=y, ack=x+1</div></div>
            <div class="hs-step"><span class="hs-side">客户端</span><div class="hs-line">ACK=1, seq=x+1, ack=y+1</div></div>
            <div class="hs-step"><span class="hs-side">状态</span><div class="hs-line">ESTABLISHED</div></div>
          </div>
        </div>
        <div class="demo-caption" id="hsCap">点击推进握手步骤</div>
        <button class="demo-btn" type="button" data-act="hs">下一步</button>
      </div>`;
    }
    return "";
  }

  function renderSubject(c) {
    const topicsHtml = c.topics
      .map(
        (t, i) => `
      <article class="topic${i === 0 ? " open" : ""}">
        <button class="topic-head" type="button">
          <span class="topic-idx">${i + 1}</span>
          <span class="topic-title">${t.title}</span>
          <span class="topic-badges">${badgeHtml(t)}</span>
          <span class="chev"></span>
        </button>
        <div class="topic-body">
          ${pointsHtml(t.points)}
          ${tableHtml(t.table)}
          ${t.demo ? demoHtml(t.demo) : ""}
        </div>
      </article>`
      )
      .join("");

    views.subject.innerHTML = `
      <div class="sub-hero">
        <div class="sub-kicker">${c.weight}</div>
        <h1 class="sub-title">${c.name}<span class="chip chip-score">${c.score}</span></h1>
      </div>
      <div class="tech-box">
        <h3>⚡ 得分技巧总结</h3>
        <ul class="tech-list">${c.tips.map((t) => `<li>${t}</li>`).join("")}</ul>
      </div>
      <div class="block-label">考点精要 · 可展开</div>
      ${topicsHtml}
      <div class="footnote">★ = 近五年高频；新 = 考纲表述细化预标注。以当年 9 月官方大纲为准。</div>
    `;

    views.subject.querySelectorAll(".topic-head").forEach((btn) => {
      btn.addEventListener("click", () => {
        const topic = btn.closest(".topic");
        const wasOpen = topic.classList.contains("open");
        views.subject.querySelectorAll(".topic.open").forEach((el) => {
          if (el !== topic) el.classList.remove("open");
        });
        topic.classList.toggle("open", !wasOpen);
        if (!wasOpen) initDemo(topic);
        else clearDemos();
      });
    });

    views.subject.querySelectorAll(".topic.open").forEach((t) => initDemo(t));
    views.subject.querySelectorAll("[data-act]").forEach((btn) => {
      btn.addEventListener("click", () => onDemoAction(btn.dataset.act));
    });
  }

  function runCacheDemo() {
    const blocks = document.querySelectorAll(".cache-block");
    const cap = document.getElementById("cacheCap");
    if (!blocks.length) return;
    const seq = [
      { slot: 0, t: "组号=0 → 比较标记… MISS，装入组 0" },
      { slot: 1, t: "tag 命中组 0 路 1 → HIT！读出数据" },
      { slot: 2, t: "组号=1 → 装入另一组" },
      { slot: 3, t: "同组另一路 HIT → 局部性生效" },
    ];
    cacheStep = 0;
    const tick = () => {
      const s = seq[cacheStep % seq.length];
      blocks.forEach((b) => b.classList.remove("hit"));
      const el = document.querySelector(`.cache-block[data-slot="${s.slot}"]`);
      if (el) {
        el.classList.add("hit");
        el.textContent = s.slot < 2 ? "tagA" : "tagB";
      }
      if (cap) cap.textContent = s.t;
      cacheStep++;
    };
    tick();
    demoTimers.push(setInterval(tick, 1600));
  }

  const procLabels = [
    ["创建 → 就绪", "调度分配 PCB"],
    ["就绪 → 运行", "被调度上核"],
    ["运行 → 阻塞", "I/O 或 P 等待"],
    ["阻塞 → 就绪", "事件完成 V 唤醒"],
    ["运行 → 完成", "正常结束"],
  ];
  const procMap = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 1],
    [2, 4],
  ];

  function runProcDemo() {
    const nodes = document.querySelectorAll(".pnode");
    const cap = document.getElementById("procCap");
    if (!nodes.length) return;
    procStep = 0;
    const tick = () => {
      nodes.forEach((n) => n.classList.remove("on"));
      const idx = procStep % 5;
      procMap[idx].forEach((i) => nodes[i] && nodes[i].classList.add("on"));
      if (cap) cap.textContent = procLabels[idx][0] + " · " + procLabels[idx][1];
      procStep++;
    };
    tick();
    demoTimers.push(setInterval(tick, 1400));
  }

  function runHsDemo() {
    const steps = document.querySelectorAll(".hs-step");
    const cap = document.getElementById("hsCap");
    if (!steps.length) return;
    if (hsStep >= 3) {
      steps.forEach((s) => s.classList.remove("on"));
      hsStep = -1;
      if (cap) cap.textContent = "已复位，再点开始";
      return;
    }
    hsStep++;
    if (steps[hsStep]) steps[hsStep].classList.add("on");
    const caps = [
      "① SYN → SYN_SENT",
      "② SYN+ACK → SYN_RCVD",
      "③ ACK → ESTABLISHED",
      "连接建立，可传数据",
    ];
    if (cap) cap.textContent = caps[hsStep] || "";
  }

  function initDemo(topic) {
    const demo = topic.querySelector(".demo");
    if (!demo || demo.dataset.ready) return;
    demo.dataset.ready = "1";
    const kind = demo.dataset.demo;
    if (kind === "cache") runCacheDemo();
    if (kind === "proc") runProcDemo();
    if (kind === "hs") {
      hsStep = -1;
      runHsDemo();
    }
  }

  function onDemoAction(act) {
    if (act === "cache") {
      clearDemos();
      runCacheDemo();
    }
    if (act === "proc") {
      clearDemos();
      runProcDemo();
    }
    if (act === "hs") runHsDemo();
  }

  document.querySelectorAll("[data-open]").forEach((el) => {
    el.addEventListener("click", () => setView("subject", el.dataset.open));
  });
  btnBack.addEventListener("click", () => setView("home"));
  dockItems.forEach((d) => {
    d.addEventListener("click", () => {
      const n = d.dataset.nav;
      if (n === "home") setView("home");
      else setView("subject", n);
    });
  });

  window.addEventListener("popstate", () => {
    const h = (location.hash || "#home").slice(1);
    if (h === "home" || !DATA[h]) setView("home", null, true);
    else setView("subject", h, true);
  });

  const initial = (location.hash || "#home").slice(1);
  if (initial && DATA[initial]) setView("subject", initial, true);
  else setView("home", null, true);
})();
