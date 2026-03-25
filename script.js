/* ============================================
   LifeLine Hospital — Frontend Interactivity
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

  // ---------- Header Scroll Effect ----------
  const header = document.getElementById('header');
  const mobileBookingBar = document.getElementById('mobileBookingBar');
  let lastScroll = 0;

  function handleScroll() {
    const currentScroll = window.scrollY;

    // Header shadow on scroll
    if (currentScroll > 20) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }

    // Show mobile booking bar after scrolling past hero
    if (mobileBookingBar) {
      if (currentScroll > window.innerHeight * 0.6) {
        mobileBookingBar.classList.add('visible');
      } else {
        mobileBookingBar.classList.remove('visible');
      }
    }

    lastScroll = currentScroll;
  }

  window.addEventListener('scroll', handleScroll, { passive: true });

  // ---------- Mobile Menu Toggle ----------
  const menuToggle = document.getElementById('menuToggle');
  const nav = document.getElementById('nav');

  if (menuToggle && nav) {
    menuToggle.addEventListener('click', () => {
      menuToggle.classList.toggle('active');
      nav.classList.toggle('active');
      document.body.style.overflow = nav.classList.contains('active') ? 'hidden' : '';
    });

    // Close menu on link click
    nav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        menuToggle.classList.remove('active');
        nav.classList.remove('active');
        document.body.style.overflow = '';
      });
    });
  }

  // ---------- Smooth Scroll ----------
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  // ---------- Scroll Animations ----------
  const animateElements = document.querySelectorAll('.animate-on-scroll, .animate-scale');

  const observerOptions = {
    threshold: 0.15,
    rootMargin: '0px 0px -40px 0px'
  };

  const scrollObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        scrollObserver.unobserve(entry.target);
      }
    });
  }, observerOptions);

  animateElements.forEach(el => scrollObserver.observe(el));

  // ---------- Animated Number Counters ----------
  const counters = document.querySelectorAll('[data-target]');
  let countersAnimated = new Set();

  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !countersAnimated.has(entry.target)) {
        countersAnimated.add(entry.target);
        animateCounter(entry.target);
      }
    });
  }, { threshold: 0.5 });

  counters.forEach(counter => counterObserver.observe(counter));

  function animateCounter(element) {
    const target = parseInt(element.getAttribute('data-target'), 10);
    const duration = 2000;
    const startTime = Date.now();

    function easeOutCubic(t) {
      return 1 - Math.pow(1 - t, 3);
    }

    function update() {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutCubic(progress);
      const current = Math.floor(eased * target);

      if (target >= 1000) {
        element.textContent = current.toLocaleString('en-IN') + '+';
      } else {
        element.textContent = current + '+';
      }

      if (progress < 1) {
        requestAnimationFrame(update);
      }
    }

    update();
  }

  // ---------- FAQ Accordion ----------
  const faqItems = document.querySelectorAll('.faq-item');

  faqItems.forEach(item => {
    const question = item.querySelector('.faq-question');
    const answer = item.querySelector('.faq-answer');

    question.addEventListener('click', () => {
      const isActive = item.classList.contains('active');

      // Close all
      faqItems.forEach(faq => {
        faq.classList.remove('active');
        faq.querySelector('.faq-answer').style.maxHeight = null;
      });

      // Open clicked if wasn't active
      if (!isActive) {
        item.classList.add('active');
        answer.style.maxHeight = answer.scrollHeight + 'px';
      }
    });
  });

  // ---------- Appointment Date Restriction ----------
  const dateInput = document.getElementById('appointmentDate');
  if (dateInput) {
    const today = new Date().toISOString().split('T')[0];
    dateInput.setAttribute('min', today);

    // Set max to 30 days from now
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 30);
    dateInput.setAttribute('max', maxDate.toISOString().split('T')[0]);
  }

  // ---------- Appointment Form Submission ----------
  const appointmentForm = document.getElementById('appointmentForm');
  const formSuccess = document.getElementById('formSuccess');

  if (appointmentForm) {
    appointmentForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const submitBtn = appointmentForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.innerHTML;
      submitBtn.innerHTML = '<span class="spinner"></span> Booking...';
      submitBtn.disabled = true;

      const formData = {
        name: document.getElementById('patientName').value,
        phone: document.getElementById('patientPhone').value,
        doctor: document.getElementById('selectDoctor').value,
        date: document.getElementById('appointmentDate').value,
        time: document.getElementById('appointmentTime').value
      };

      try {
        // Try to submit to backend
        const response = await fetch('/api/appointments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });

        if (!response.ok) throw new Error('Server error');
        console.log('Appointment submitted to server:', formData);
      } catch (err) {
        // If no backend is running, store locally
        console.log('Backend not available. Appointment data:', formData);
        const appointments = JSON.parse(localStorage.getItem('lifeline_appointments') || '[]');
        appointments.push({ ...formData, id: Date.now(), createdAt: new Date().toISOString() });
        localStorage.setItem('lifeline_appointments', JSON.stringify(appointments));
      }

      // Show success state
      setTimeout(() => {
        appointmentForm.style.display = 'none';
        formSuccess.classList.add('active');
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
      }, 1000);
    });
  }

  // ---------- Active Nav Highlight ----------
  const sections = document.querySelectorAll('section[id]');

  function highlightNav() {
    const scrollPos = window.scrollY + 100;

    sections.forEach(section => {
      const top = section.offsetTop;
      const height = section.offsetHeight;
      const id = section.getAttribute('id');
      const navLink = document.querySelector(`.nav a[href="#${id}"]`);

      if (navLink) {
        if (scrollPos >= top && scrollPos < top + height) {
          document.querySelectorAll('.nav a').forEach(l => l.classList.remove('active'));
          navLink.classList.add('active');
        }
      }
    });
  }

  window.addEventListener('scroll', highlightNav, { passive: true });

  // ---------- Lazy Image Loading ----------
  if ('loading' in HTMLImageElement.prototype) {
    // Native lazy loading supported — images already have loading="lazy"
  } else {
    // Fallback for older browsers
    const lazyImages = document.querySelectorAll('img[loading="lazy"]');
    const imageObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.src; // trigger load
          imageObserver.unobserve(img);
        }
      });
    });
    lazyImages.forEach(img => imageObserver.observe(img));
  }

  // ---------- Phone Input Formatting ----------
  const phoneInput = document.getElementById('patientPhone');
  if (phoneInput) {
    phoneInput.addEventListener('input', (e) => {
      // Only allow numbers
      e.target.value = e.target.value.replace(/[^0-9]/g, '').slice(0, 10);
    });
  }

  // ---------- Doctor Card Swipe Hint (Mobile) ----------
  const doctorsScroll = document.getElementById('doctorsScroll');
  if (doctorsScroll && window.innerWidth < 768) {
    // Auto-scroll hint
    setTimeout(() => {
      doctorsScroll.scrollTo({ left: 40, behavior: 'smooth' });
      setTimeout(() => {
        doctorsScroll.scrollTo({ left: 0, behavior: 'smooth' });
      }, 600);
    }, 2000);
  }

  // ---------- Emergency Float Visibility ----------
  const emergencyFloat = document.getElementById('emergencyFloat');
  if (emergencyFloat) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 300) {
        emergencyFloat.style.opacity = '1';
        emergencyFloat.style.pointerEvents = 'auto';
      } else {
        emergencyFloat.style.opacity = '0';
        emergencyFloat.style.pointerEvents = 'none';
      }
    }, { passive: true });

    // Initially hidden
    emergencyFloat.style.opacity = '0';
    emergencyFloat.style.pointerEvents = 'none';
  }

  // ---------- AI Voice Agent (LiveKit) ----------
  const voiceBtn = document.getElementById('voiceAgentBtn');
  const voiceOverlay = document.getElementById('voiceOverlay');
  const closeOverlay = document.getElementById('closeOverlay');
  const startCallBtn = document.getElementById('startCallBtn');
  const endCallBtn = document.getElementById('endCallBtn');
  const statusText = document.getElementById('voiceStatusText');

  let room = null;

  if (voiceBtn) {
    voiceBtn.addEventListener('click', () => {
      voiceOverlay.classList.add('active');
    });
  }

  if (closeOverlay) {
    closeOverlay.addEventListener('click', () => {
      // Don't close if calling
      if (!room) {
        voiceOverlay.classList.remove('active');
      } else {
        alert("Please end the call before closing.");
      }
    });
  }

  if (startCallBtn) startCallBtn.addEventListener('click', startVoiceChat);
  if (endCallBtn) endCallBtn.addEventListener('click', endVoiceChat);

  async function startVoiceChat() {
    try {
      startCallBtn.disabled = true;
      startCallBtn.innerText = "Connecting...";
      statusText.innerText = "Requesting secure token...";

      // 1. Get token from our backend
      const response = await fetch('/api/livekit-token');
      const { token, url: livekitUrlFromServer } = await response.json();

      // 2. Connect to LiveKit
      statusText.innerText = "Connecting to voice server...";
      room = new LivekitClient.Room({
        adaptiveStream: true,
        dynacast: true,
      });

      // Setup room events
      room.on('connected', () => {
        statusText.innerText = "AI Assistant Is Listening...";
        voiceOverlay.classList.add('calling');
        startCallBtn.style.display = 'none';
        endCallBtn.style.display = 'inline-block';
      });

      room.on('disconnected', () => {
        endVoiceChat();
      });

      await room.connect(livekitUrlFromServer, token);

      // 3. Publish local audio
      statusText.innerText = "Activating microphone...";
      await room.localParticipant.setMicrophoneEnabled(true);

    } catch (err) {
      console.error("Voice Chat Error:", err);
      statusText.innerText = "Connection failed. Check your internet or API keys.";
      startCallBtn.disabled = false;
      startCallBtn.innerText = "Retry Call";
    }
  }

  function endVoiceChat() {
    if (room) {
      room.disconnect();
      room = null;
    }
    voiceOverlay.classList.remove('calling');
    startCallBtn.style.display = 'inline-block';
    endCallBtn.style.display = 'none';
    statusText.innerText = "Call ended.";
    startCallBtn.disabled = false;
    startCallBtn.innerText = "Start Call";
  }

});

