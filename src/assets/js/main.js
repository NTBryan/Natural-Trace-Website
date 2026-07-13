/* Scroll animations (multi-page) */
(function() {
  function initAnims() {
    var elems = document.querySelectorAll('.anim');
    if (!elems.length) return;
    if ('IntersectionObserver' in window) {
      var obs = new IntersectionObserver(function(entries) {
        entries.forEach(function(e) {
          if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); }
        });
      }, { threshold: 0.1 });
      elems.forEach(function(el) { obs.observe(el); });
      /* Failsafe: if observer hasn't fired after 2s, force all visible */
      setTimeout(function() {
        document.querySelectorAll('.anim:not(.visible)').forEach(function(el) { el.classList.add('visible'); });
      }, 2000);
    } else {
      /* No IntersectionObserver support — show everything */
      elems.forEach(function(el) { el.classList.add('visible'); });
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAnims);
  } else {
    initAnims();
  }
})();

/* Splash intro — skippable, cookie-suppressed on repeat visits */
(function(){
  var o = document.getElementById('splashOverlay');
  var v = document.getElementById('splashVideo');
  var hint = document.getElementById('splashUnmute');
  var skip = document.getElementById('splashSkip');
  if(!o) return;

  /* Check cookie — skip intro entirely on repeat visits */
  if(document.cookie.indexOf('nt_intro_seen=1') !== -1){
    o.remove();
    document.body.classList.remove('splash-active');
    return;
  }

  function dismiss(){
    if(o._dismissed) return;
    o._dismissed = true;
    o.classList.add('fade-out');
    document.body.classList.remove('splash-active');
    setTimeout(function(){ o.remove(); }, 700);
    /* Set cookie — expires in 30 days */
    document.cookie = 'nt_intro_seen=1;path=/;max-age=' + (30*24*60*60) + ';SameSite=Lax';
  }

  if(!v) { dismiss(); return; }

  v.addEventListener('ended', dismiss);

  /* Skip button */
  if(skip) skip.addEventListener('click', function(e){
    e.stopPropagation();
    dismiss();
  });

  /* Try autoplay with audio; if blocked, mute and show hint */
  var playAttempt = v.play();
  if(playAttempt !== undefined){
    playAttempt.catch(function(){
      v.muted = true;
      v.play();
      if(hint) hint.style.display = 'block';
    });
  }

  o.addEventListener('click', function(){
    if(v.muted){ v.muted = false; if(hint) hint.style.display = 'none'; }
    else dismiss();
  });

  /* Fallback timeout */
  setTimeout(dismiss, 15000);
})();

/* Active nav state */
window.addEventListener('DOMContentLoaded', function() {
  var path = window.location.pathname.replace(/\/$/, '');
  var pageName = path.split('/').pop() || 'home';
  document.querySelectorAll('.nav-links a[data-page]').forEach(function(a) {
    if (a.getAttribute('data-page') === pageName) a.classList.add('active');
  });
  /* Set navbar scrolled state for non-home pages */
  if (pageName !== 'home' && pageName !== '') {
    document.getElementById('navbar').classList.add('scrolled');
  }
});



/* Navbar scroll (only on home) */
window.addEventListener('scroll', () => {
  var p = window.location.pathname;
  if (p === '/' || p.endsWith('/home/') || p.endsWith('/Natural-Trace-Website/')) {
    document.getElementById('navbar').classList.toggle('scrolled', window.scrollY > 60);
  }
});

/* Parallax hero */
window.addEventListener('scroll', () => {
  const bg = document.getElementById('heroBg');
  if (bg) bg.style.transform = 'translateY(' + (window.scrollY * 0.35) + 'px)';
});

/* Counter animation */
const countObs = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      const el = e.target;
      const target = +el.dataset.target;
      const dur = 2000;
      const start = performance.now();
      const animate = (now) => {
        const p = Math.min((now - start) / dur, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.floor(eased * target);
        if (p < 1) requestAnimationFrame(animate);
        else el.textContent = target;
      };
      requestAnimationFrame(animate);
      countObs.unobserve(el);
    }
  });
}, {threshold:.5});
document.querySelectorAll('.count').forEach(el => countObs.observe(el));

/* Contact form */
function handleContactSubmit(e) {
  e.preventDefault();
  document.getElementById('contactForm').style.display = 'none';
  document.getElementById('formSuccess').style.display = 'block';
  return false;
}

function switchCareersTab(tab) {
  document.querySelectorAll('.careers-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.careers-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('careers-' + tab).classList.add('active');
  event.target.classList.add('active');
}

function handleInternshipSubmit(e) {
  e.preventDefault();
  var form = document.getElementById('internshipForm');
  var data = new FormData(form);
  var body = 'New internship application from ' + data.get('firstName') + ' ' + data.get('lastName') +
    '%0D%0AEmail: ' + data.get('email') +
    '%0D%0AUniversity: ' + data.get('university') +
    '%0D%0AArea of Interest: ' + data.get('interest') +
    '%0D%0A%0D%0A' + data.get('message');
  window.location.href = 'mailto:alrik@natural-trace.com?subject=Internship Application - ' +
    encodeURIComponent(data.get('firstName') + ' ' + data.get('lastName')) + '&body=' + body;
  form.style.display = 'none';
  document.getElementById('internshipSuccess').style.display = 'block';
  return false;
}

/* Team modal — data injected from team.json via template on team page */
function openTeamModal(idx) {
  if (typeof teamData === 'undefined' || !teamData[idx]) return;
  var d = teamData[idx];
  document.getElementById('modalName').textContent = d.name;
  document.getElementById('modalRole').textContent = d.role;
  document.getElementById('modalLoc').textContent = d.location || '';
  var prefix = (typeof basePrefix !== 'undefined' && basePrefix !== '/') ? basePrefix.replace(/\/$/, '') : '';
  document.getElementById('modalPhoto').src = d.photo.startsWith('/') ? prefix + d.photo : d.photo;
  var ll = document.getElementById('modalLinkedin');
  if (d.linkedin) { ll.href = d.linkedin; ll.style.display = ''; } else { ll.style.display = 'none'; }
  var eduHtml = '';
  if (d.education && d.education.length) d.education.forEach(function(e) { eduHtml += '<li>' + e + '</li>'; });
  document.getElementById('modalEdu').innerHTML = eduHtml || '<li>Details available on LinkedIn</li>';
  var bioHtml = '';
  if (d.bio && d.bio.length) d.bio.forEach(function(b) { bioHtml += '<li>' + b + '</li>'; });
  document.getElementById('modalBio').innerHTML = bioHtml;
  document.getElementById('teamModal').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeTeamModal() {
  document.getElementById('teamModal').classList.remove('active');
  document.body.style.overflow = '';
}

document.addEventListener('keydown', function(e) { if (e.key === 'Escape') closeTeamModal(); });
var teamModalEl = document.getElementById('teamModal');
if (teamModalEl) teamModalEl.addEventListener('click', function(e) { if (e.target === this) closeTeamModal(); });

/* FAQ functions */
function toggleFaqItem(btn) {
  var item = btn.parentElement;
  var wasOpen = item.classList.contains('open');
  document.querySelectorAll('.faq-item.open').forEach(function(el) { el.classList.remove('open'); });
  if (!wasOpen) item.classList.add('open');
}

function filterFaq(cat) {
  document.querySelectorAll('.faq-cat-btn').forEach(function(b) { b.classList.remove('active'); });
  event.target.classList.add('active');
  document.querySelectorAll('.faq-item').forEach(function(item) {
    if (cat === 'all' || item.dataset.cat === cat) { item.style.display = ''; }
    else { item.style.display = 'none'; }
  });
}

/* ===== Compatibility Quiz ===== */
(function() {
  var state = { step: 0, category: null, formulations: [], temp: null, ph: null };

  var categories = [
    { id: 'vitamins', name: 'Vitamins & Minerals', icon: '<svg viewBox="0 0 40 40" width="32" height="32"><rect x="14" y="6" width="12" height="28" rx="6" fill="none" stroke="currentColor" stroke-width="2"/><line x1="14" y1="20" x2="26" y2="20" stroke="currentColor" stroke-width="2"/></svg>' },
    { id: 'omega', name: 'Omega-3 & Fish Oil', icon: '<svg viewBox="0 0 40 40" width="32" height="32"><ellipse cx="20" cy="20" rx="14" ry="9" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="20" cy="20" r="3" fill="currentColor"/></svg>' },
    { id: 'probiotics', name: 'Probiotics & Gut Health', icon: '<svg viewBox="0 0 40 40" width="32" height="32"><circle cx="15" cy="18" r="5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="25" cy="22" r="5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="20" cy="13" r="3" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>' },
    { id: 'joint', name: 'Joint & Bone', icon: '<svg viewBox="0 0 40 40" width="32" height="32"><line x1="12" y1="28" x2="28" y2="12" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><circle cx="10" cy="30" r="4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="30" cy="10" r="4" fill="none" stroke="currentColor" stroke-width="2"/></svg>' },
    { id: 'collagen', name: 'Collagen & Beauty', icon: '<svg viewBox="0 0 40 40" width="32" height="32"><path d="M20 6 C10 10, 10 30, 20 34 C30 30, 30 10, 20 6Z" fill="none" stroke="currentColor" stroke-width="2"/></svg>' },
    { id: 'herbal', name: 'Herbal & Botanical', icon: '<svg viewBox="0 0 40 40" width="32" height="32"><path d="M20 34 V18 M14 22 Q20 14, 26 22 M10 28 Q20 18, 30 28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' },
    { id: 'sports', name: 'Sports Nutrition', icon: '<svg viewBox="0 0 40 40" width="32" height="32"><circle cx="20" cy="20" r="12" fill="none" stroke="currentColor" stroke-width="2"/><line x1="8" y1="20" x2="32" y2="20" stroke="currentColor" stroke-width="2"/><line x1="20" y1="8" x2="20" y2="32" stroke="currentColor" stroke-width="2"/></svg>' },
    { id: 'immune', name: 'Immune Support', icon: '<svg viewBox="0 0 40 40" width="32" height="32"><path d="M20 8 L22 16 L30 16 L24 21 L26 29 L20 24 L14 29 L16 21 L10 16 L18 16Z" fill="none" stroke="currentColor" stroke-width="2"/></svg>' },
    { id: 'weight', name: 'Weight Management', icon: '<svg viewBox="0 0 40 40" width="32" height="32"><rect x="10" y="14" width="20" height="16" rx="3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M15 14 V10 Q20 6, 25 10 V14" fill="none" stroke="currentColor" stroke-width="2"/></svg>' },
    { id: 'children', name: 'Children\'s Supplements', icon: '<svg viewBox="0 0 40 40" width="32" height="32"><circle cx="20" cy="14" r="6" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 34 Q12 24, 20 22 Q28 24, 28 34" fill="none" stroke="currentColor" stroke-width="2"/></svg>' },
    { id: 'specialty', name: 'Specialty Health', icon: '<svg viewBox="0 0 40 40" width="32" height="32"><path d="M14 18 Q20 10, 26 18 Q26 26, 20 32 Q14 26, 14 18Z" fill="none" stroke="currentColor" stroke-width="2"/></svg>' },
    { id: 'functional', name: 'Functional Foods', icon: '<svg viewBox="0 0 40 40" width="32" height="32"><path d="M12 28 Q12 16, 20 12 Q28 16, 28 28Z" fill="none" stroke="currentColor" stroke-width="2"/><line x1="20" y1="12" x2="20" y2="8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' }
  ];

  var formulations = [
    { id: 'tablet', name: 'Compressed Tablet', risk: 'LOW', score: 95 },
    { id: 'capsule', name: 'Hard Capsule', risk: 'LOW', score: 95 },
    { id: 'softgel', name: 'Softgel', risk: 'MEDIUM-HIGH', score: 68 },
    { id: 'gummy', name: 'Gummy', risk: 'HIGH', score: 55 },
    { id: 'chewable', name: 'Chewable', risk: 'LOW-MEDIUM', score: 88 },
    { id: 'powder', name: 'Powder / Sachet', risk: 'LOW-MEDIUM', score: 88 },
    { id: 'liquid', name: 'Liquid / Syrup', risk: 'HIGH', score: 55 },
    { id: 'effervescent', name: 'Effervescent', risk: 'MEDIUM', score: 78 },
    { id: 'lozenge', name: 'Lozenge', risk: 'VERY HIGH', score: 40 },
    { id: 'bar', name: 'Bar', risk: 'MEDIUM-HIGH', score: 68 },
    { id: 'rtd', name: 'RTD Beverage', risk: 'VERY HIGH', score: 40 },
    { id: 'drops', name: 'Drops', risk: 'MEDIUM', score: 78 }
  ];

  var catFormMap = {
    vitamins: ['tablet','capsule','softgel','gummy','chewable','powder','effervescent'],
    omega: ['softgel','capsule','liquid','gummy','drops'],
    probiotics: ['capsule','powder','chewable','liquid','gummy'],
    joint: ['tablet','capsule','softgel','powder','liquid'],
    collagen: ['powder','liquid','capsule','gummy'],
    herbal: ['capsule','tablet','liquid','powder','drops'],
    sports: ['powder','capsule','bar','rtd','tablet'],
    immune: ['tablet','capsule','gummy','effervescent','lozenge','liquid'],
    weight: ['powder','capsule','bar','rtd','liquid'],
    children: ['gummy','chewable','liquid','drops','powder'],
    specialty: ['capsule','tablet','softgel','liquid','gummy'],
    functional: ['powder','liquid','bar','rtd','gummy','capsule']
  };

  var tempOptions = [
    { label: 'Below 40°C', mod: 0 },
    { label: '40–65°C', mod: -5 },
    { label: '65–100°C', mod: -15 },
    { label: 'Above 100°C', mod: -25 }
  ];

  var phOptions = [
    { label: 'Neutral (pH 5–8)', mod: 0 },
    { label: 'Mildly Acidic (pH 4–5)', mod: -5 },
    { label: 'Very Acidic (pH < 4)', mod: -15 },
    { label: 'Alkaline (pH > 8)', mod: -10 }
  ];

  function el(id) { return document.getElementById(id); }

  function renderCategories() {
    var grid = el('compatCategories');
    if (!grid) return;
    grid.innerHTML = '';
    categories.forEach(function(cat) {
      var card = document.createElement('div');
      card.className = 'compat-card';
      card.setAttribute('data-id', cat.id);
      card.innerHTML = '<div class="compat-card-icon">' + cat.icon + '</div><span class="compat-card-label">' + cat.name + '</span>';
      card.onclick = function() { selectCard('compatCategories', cat.id); state.category = cat.id; el('compatNext1').classList.add('visible'); };
      grid.appendChild(card);
    });
  }

  function renderFormulations() {
    var grid = el('compatFormulations');
    if (!grid) return;
    var allowed = catFormMap[state.category] || formulations.map(function(f) { return f.id; });
    grid.innerHTML = '';
    state.formulations = [];
    formulations.forEach(function(form) {
      if (allowed.indexOf(form.id) < 0) return;
      var card = document.createElement('div');
      card.className = 'compat-card';
      card.setAttribute('data-id', form.id);
      card.innerHTML = '<span class="compat-card-label">' + form.name + '</span>';
      card.onclick = function() {
        card.classList.toggle('selected');
        var idx = state.formulations.indexOf(form.id);
        if (idx >= 0) { state.formulations.splice(idx, 1); } else { state.formulations.push(form.id); }
        if (state.formulations.length > 0) { el('compatNext2').classList.add('visible'); } else { el('compatNext2').classList.remove('visible'); }
      };
      grid.appendChild(card);
    });
  }

  function renderConditions() {
    var tg = el('compatTempOptions'); var pg = el('compatPhOptions');
    if (!tg || !pg) return;
    tg.innerHTML = ''; pg.innerHTML = '';
    tempOptions.forEach(function(opt, i) {
      var btn = document.createElement('button');
      btn.className = 'compat-condition-btn';
      btn.textContent = opt.label;
      btn.onclick = function() { selectCondition('compatTempOptions', i); state.temp = i; checkStep3Ready(); };
      tg.appendChild(btn);
    });
    phOptions.forEach(function(opt, i) {
      var btn = document.createElement('button');
      btn.className = 'compat-condition-btn';
      btn.textContent = opt.label;
      btn.onclick = function() { selectCondition('compatPhOptions', i); state.ph = i; checkStep3Ready(); };
      pg.appendChild(btn);
    });
  }

  function selectCard(gridId, id) {
    var cards = el(gridId).querySelectorAll('.compat-card');
    cards.forEach(function(c) { c.classList.remove('selected'); });
    var target = el(gridId).querySelector('[data-id="' + id + '"]');
    if (target) target.classList.add('selected');
  }

  function selectCondition(groupId, idx) {
    var btns = el(groupId).querySelectorAll('.compat-condition-btn');
    btns.forEach(function(b) { b.classList.remove('selected'); });
    btns[idx].classList.add('selected');
  }

  function checkStep3Ready() {
    if (state.temp !== null && state.ph !== null) {
      el('compatNext3').classList.add('visible');
    }
  }

  function showScreen(id) {
    var screens = document.querySelectorAll('.compat-screen');
    screens.forEach(function(s) { s.classList.remove('active'); });
    var target = el(id);
    if (target) target.classList.add('active');
  }

  window.compatStart = function() {
    el('compatProgress').style.display = 'flex';
    renderCategories();
    showScreen('compatStep1');
    updateProgress(1);
  };

  window.compatGoStep = function(step) {
    if (step === 1) {
      showScreen('compatStep1');
      updateProgress(1);
    } else if (step === 2) {
      renderFormulations();
      el('compatNext2').classList.remove('visible');
      showScreen('compatStep2');
      updateProgress(2);
    } else if (step === 3) {
      renderConditions();
      el('compatNext3').classList.remove('visible');
      showScreen('compatStep3');
      updateProgress(3);
    }
  };

  window.compatShowResult = function() {
    var baseScore = 78;
    if (state.formulations && state.formulations.length > 0) {
      baseScore = Math.min.apply(null, state.formulations.map(function(fid) {
        var f = formulations.find(function(x) { return x.id === fid; });
        return f ? f.score : 78;
      }));
    }
    var tempMod = state.temp !== null ? tempOptions[state.temp].mod : 0;
    var phMod = state.ph !== null ? phOptions[state.ph].mod : 0;
    var score = Math.max(10, Math.min(100, baseScore + tempMod + phMod));

    el('compatProgress').style.display = 'none';
    showScreen('compatResult');

    var color, verdict, recTitle, recDesc, tierLabel, tierFill;
    if (score >= 80) {
      color = '#4CAF50'; tierLabel = 'Ideal Candidate'; tierFill = 0.95;
      verdict = 'Your product is ready to be NaturalTagged!';
      recTitle = 'Direct Integration';
      recDesc = 'Your product\'s formulation and processing conditions are well-suited for NaturalTag. The molecular marker can be incorporated directly into your manufacturing process with minimal modification.';
    } else if (score >= 60) {
      color = 'var(--gold)'; tierLabel = 'Strong Candidate'; tierFill = 0.72;
      verdict = 'Your product is a strong candidate for NaturalTag!';
      recTitle = 'Tailored Integration';
      recDesc = 'Your product is well-suited for NaturalTag with a tailored integration approach to protect the molecular marker during your specific processing conditions.';
    } else if (score >= 40) {
      color = 'var(--teal)'; tierLabel = 'Custom Approach'; tierFill = 0.48;
      verdict = 'Your product can be NaturalTagged with a custom approach!';
      recTitle = 'Advanced Integration';
      recDesc = 'Your processing conditions require our advanced integration protocol. We\'ll design a custom strategy optimized for your specific temperature and pH profile.';
    } else {
      color = 'var(--sage)'; tierLabel = 'Exploratory'; tierFill = 0.25;
      verdict = 'Let\'s explore a solution for your product!';
      recTitle = 'Feasibility Study';
      recDesc = 'Your product presents unique challenges that our R&D team can investigate. We\'ll conduct a feasibility study to design a tagging strategy tailored to your exact manufacturing process.';
    }

    el('compatScoreCircle').style.stroke = color;
    el('compatVerdict').style.color = color;

    // Animate circle to tier level
    var circumference = 2 * Math.PI * 80;
    var offset = circumference - tierFill * circumference;
    setTimeout(function() {
      el('compatScoreCircle').style.transition = 'stroke-dashoffset 1.5s ease';
      el('compatScoreCircle').style.strokeDashoffset = offset;
    }, 200);

    // Show tier label instead of number
    var numEl = el('compatScoreNum');
    numEl.style.fontSize = '1.3rem';
    numEl.style.fontFamily = "'Inter', sans-serif";
    numEl.style.fontWeight = '700';
    numEl.style.color = color;
    numEl.style.lineHeight = '1.2';
    numEl.style.textAlign = 'center';
    setTimeout(function() { numEl.textContent = tierLabel; }, 600);

    // Show verdict and recommendation
    setTimeout(function() {
      el('compatVerdict').textContent = verdict;
      el('compatVerdict').style.opacity = '1';
    }, 800);

    setTimeout(function() {
      el('compatRecTitle').textContent = recTitle;
      el('compatRecDesc').textContent = recDesc;
      el('compatRecCard').style.opacity = '1';
      el('compatRecCard').style.transform = 'translateY(0)';
    }, 1200);

    setTimeout(function() {
      el('compatActions').style.opacity = '1';
    }, 1600);

    // Confetti for high scores
    if (score >= 80) {
      setTimeout(function() { spawnConfetti(); }, 600);
    }
  };

  function spawnConfetti() {
    var container = el('compatResult');
    var colors = ['#6B7249', '#A29349', '#3B666B', '#4CAF50', '#FFD700'];
    for (var i = 0; i < 40; i++) {
      var dot = document.createElement('div');
      dot.className = 'compat-confetti';
      dot.style.left = Math.random() * 100 + '%';
      dot.style.background = colors[Math.floor(Math.random() * colors.length)];
      dot.style.animationDelay = Math.random() * 0.8 + 's';
      dot.style.animationDuration = (1.5 + Math.random()) + 's';
      container.appendChild(dot);
      setTimeout(function(d) { d.remove(); }.bind(null, dot), 3000);
    }
  }

  window.compatReset = function() {
    state = { step: 0, category: null, formulations: [], temp: null, ph: null };
    el('compatProgress').style.display = 'none';
    el('compatNext1').classList.remove('visible');
    el('compatScoreCircle').style.transition = 'none';
    el('compatScoreCircle').style.strokeDashoffset = '502.65';
    var numEl = el('compatScoreNum');
    numEl.textContent = '';
    numEl.style.fontSize = '';
    numEl.style.fontFamily = '';
    numEl.style.fontWeight = '';
    numEl.style.color = '';
    numEl.style.lineHeight = '';
    numEl.style.textAlign = '';
    el('compatVerdict').textContent = '';
    el('compatVerdict').style.opacity = '0';
    el('compatRecCard').style.opacity = '0';
    el('compatRecCard').style.transform = 'translateY(20px)';
    el('compatActions').style.opacity = '0';
    showScreen('compatWelcome');
  };

  function updateProgress(step) {
    el('compatStepLabel').textContent = 'Step ' + step + ' of 3';
    el('compatProgressFill').style.width = (step * 33) + '%';
  }

  // Initialize
  renderCategories();
})();


