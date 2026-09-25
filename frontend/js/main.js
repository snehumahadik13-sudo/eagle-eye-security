// Mobile nav toggle
  const burger = document.getElementById('burgerBtn');
  const navLinks = document.getElementById('navLinks');
  burger.addEventListener('click', () => navLinks.classList.toggle('open'));
  navLinks.querySelectorAll('a').forEach(a => a.addEventListener('click', () => navLinks.classList.remove('open')));

  // 3D tilt on glass cards
  document.querySelectorAll('.glass-card').forEach(card => {
    card.addEventListener('mousemove', e => {
      const r = card.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      const cx = x / r.width - 0.5;
      const cy = y / r.height - 0.5;
      card.style.transform = `rotateX(${(-cy * 8).toFixed(2)}deg) rotateY(${(cx * 10).toFixed(2)}deg) translateY(-4px)`;
      card.style.setProperty('--mx', x + 'px');
      card.style.setProperty('--my', y + 'px');
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = 'rotateX(0) rotateY(0) translateY(0)';
    });
  });

  // ---------------------------------------------------------------------
  // Contact / enquiry form -> backend API
  // ---------------------------------------------------------------------
  const enquiryForm = document.getElementById('enquiryForm');
  if (enquiryForm) {
    enquiryForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('enquirySubmitBtn');
      const msg = document.getElementById('enquiryFormMsg');
      const data = Object.fromEntries(new FormData(enquiryForm).entries());

      btn.disabled = true;
      btn.textContent = 'Sending…';
      msg.textContent = '';
      msg.className = 'form-msg';

      try {
        const res = await fetch(`${API_BASE_URL}/api/enquiries`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || 'Something went wrong.');
        enquiryForm.reset();
        msg.textContent = "Thanks — we've received your enquiry and will be in touch shortly.";
        msg.classList.add('success');
      } catch (err) {
        msg.textContent = err.message || 'Could not send your enquiry. Please try WhatsApp instead.';
        msg.classList.add('error');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Submit';
      }
    });
  }

  // ---------------------------------------------------------------------
  // Careers: load open positions from backend, render cards
  // ---------------------------------------------------------------------
  const roleGrid = document.getElementById('roleGrid');
  const applyModalBackdrop = document.getElementById('applyModalBackdrop');
  const applyModalTitle = document.getElementById('applyModalTitle');
  const applyJobIdInput = document.getElementById('applyJobId');
  const applyForm = document.getElementById('applyForm');

  function openApplyModal(jobId, jobTitle) {
    applyJobIdInput.value = jobId || '';
    applyModalTitle.textContent = jobTitle ? `Apply — ${jobTitle}` : 'Apply';
    applyModalBackdrop.classList.add('open');
  }
  function closeApplyModal() {
    applyModalBackdrop.classList.remove('open');
    applyForm.reset();
    document.getElementById('applyFormMsg').textContent = '';
  }
  document.getElementById('applyModalClose')?.addEventListener('click', closeApplyModal);
  applyModalBackdrop?.addEventListener('click', (e) => { if (e.target === applyModalBackdrop) closeApplyModal(); });

  if (applyForm) {
    applyForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const msg = document.getElementById('applyFormMsg');
      const data = Object.fromEntries(new FormData(applyForm).entries());
      const btn = applyForm.querySelector('button[type="submit"]');

      btn.disabled = true;
      btn.textContent = 'Submitting…';
      msg.textContent = '';
      msg.className = 'form-msg';

      try {
        const res = await fetch(`${API_BASE_URL}/api/applications`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || 'Something went wrong.');
        msg.textContent = "Application received — we'll reach out soon.";
        msg.classList.add('success');
        setTimeout(closeApplyModal, 1800);
      } catch (err) {
        msg.textContent = err.message || 'Could not submit. Please try WhatsApp instead.';
        msg.classList.add('error');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Submit Application';
      }
    });
  }

  if (roleGrid) {
    fetch(`${API_BASE_URL}/api/jobs`)
      .then((res) => res.json())
      .then((jobs) => {
        if (!Array.isArray(jobs) || jobs.length === 0) {
          roleGrid.innerHTML = '<p class="muted" style="color:var(--silver-dim);">No open positions right now — check back soon, or reach out on WhatsApp.</p>';
          return;
        }
        roleGrid.innerHTML = jobs.map((job) => {
          const reqs = (job.requirements || '').split('\n').filter(Boolean);
          const locations = (job.location || '').split(',').map((s) => s.trim()).filter(Boolean);
          return `
            <div class="role-card">
              <div class="role-top"><h3>${job.title}</h3></div>
              ${job.description ? `<p style="color:var(--silver-dim);font-size:.9rem;margin-bottom:12px;">${job.description}</p>` : ''}
              ${reqs.length ? `<ul>${reqs.map((r) => `<li>${r}</li>`).join('')}</ul>` : ''}
              <div class="locations">${locations.map((l) => `<span class="loc-chip">${l}</span>`).join('')}</div>
              <button type="button" class="btn btn-primary btn-sm apply-btn" data-job-id="${job.id}" data-job-title="${job.title}">Apply Now</button>
            </div>`;
        }).join('');

        roleGrid.querySelectorAll('.apply-btn').forEach((b) => {
          b.addEventListener('click', () => openApplyModal(b.dataset.jobId, b.dataset.jobTitle));
        });
      })
      .catch(() => {
        roleGrid.innerHTML = '<p class="muted" style="color:var(--silver-dim);">Could not load job openings. Please reach out on WhatsApp.</p>';
      });
  }
